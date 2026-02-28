import { appConfig } from "@/lib/config/appConfig";
import { labelCategory } from "@/lib/utils/labelMap";
import type {
  CoreAreaResult,
  DeliveryEngineerBreakdown,
  DeliveryImpactResult,
  DeliveryPrAttribution,
  DeliverySizeBucket,
  NormalizedImpactInputs,
  ScoreByEngineer,
} from "@/lib/types";

type ScoreDeliveryImpactParams = {
  inputs: NormalizedImpactInputs;
  core: CoreAreaResult | { corePrefixes: string[] };
};

export function scoreDeliveryImpact(
  params: ScoreDeliveryImpactParams
): DeliveryImpactResult {
  const { inputs } = params;
  const coreSet = new Set(params.core.corePrefixes);
  const scoring = appConfig.deliveryScoring;
  const byEngineer: ScoreByEngineer<DeliveryEngineerBreakdown> = {};
  const windowStartMs = Date.parse(inputs.windowStart);
  const windowEndMs = Date.parse(inputs.windowEnd);

  for (const pr of inputs.pullRequests) {
    if (!pr.mergedAt) continue;
    const mergedAtMs = Date.parse(pr.mergedAt);
    if (
      Number.isFinite(windowStartMs) &&
      Number.isFinite(windowEndMs) &&
      Number.isFinite(mergedAtMs) &&
      (mergedAtMs < windowStartMs || mergedAtMs > windowEndMs)
    ) {
      continue;
    }

    if (!pr.author?.login?.trim()) continue;
    if (pr.author.isBot) continue;

    const authorLogin = pr.author.login;
    const sizeBucket = determineSizeBucket(pr.changedFiles, pr.additions, pr.deletions);
    const sizePoints = scoring.sizeBucketPoints[sizeBucket];
    const isCoreTouched = Boolean(pr.files?.some((file) => coreSet.has(file.prefix)));
    const hasFeatureLabel = pr.labels.some((label) => labelCategory(label) === "feature");

    const coreMultiplier = isCoreTouched ? scoring.coreAreaMultiplier : 1;
    const featureMultiplier = hasFeatureLabel ? scoring.featureLabelMultiplier : 1;
    const finalPrPoints = sizePoints * coreMultiplier * featureMultiplier;

    const attribution: DeliveryPrAttribution = {
      prNumber: pr.number,
      prTitle: pr.title,
      prUrl: pr.url,
      mergedAt: pr.mergedAt,
      authorLogin,
      sizeBucket,
      sizePoints,
      isCoreTouched,
      coreMultiplier,
      hasFeatureLabel,
      featureMultiplier,
      finalPrPoints,
    };

    if (!byEngineer[authorLogin]) {
      byEngineer[authorLogin] = {
        engineerLogin: authorLogin,
        prCount: 0,
        rawPoints: 0,
        normalizedScore: 0,
        attributions: [],
      };
    }

    byEngineer[authorLogin].prCount += 1;
    byEngineer[authorLogin].rawPoints += finalPrPoints;
    byEngineer[authorLogin].attributions.push(attribution);
  }

  const engineerScores = Object.values(byEngineer).filter((row) => row.prCount >= 1);
  for (const engineer of engineerScores) {
    engineer.attributions.sort((a, b) => b.mergedAt.localeCompare(a.mergedAt));
    engineer.attributions = engineer.attributions.slice(
      0,
      scoring.maxAttributionsPerEngineer
    );
  }

  const withPoints = engineerScores.filter((row) => row.rawPoints > 0);
  let minRaw = 0;
  let maxRaw = 0;

  if (withPoints.length > 0) {
    minRaw = Math.min(...withPoints.map((row) => row.rawPoints));
    maxRaw = Math.max(...withPoints.map((row) => row.rawPoints));
  }

  if (withPoints.length === 1 || maxRaw === minRaw) {
    for (const engineer of engineerScores) {
      engineer.normalizedScore = engineer.rawPoints > 0 ? 100 : 0;
    }
  } else {
    for (const engineer of engineerScores) {
      if (engineer.rawPoints <= 0) {
        engineer.normalizedScore = 0;
        continue;
      }
      engineer.normalizedScore =
        ((engineer.rawPoints - minRaw) / (maxRaw - minRaw)) * 100;
    }
  }

  engineerScores.sort(
    (a, b) =>
      b.normalizedScore - a.normalizedScore ||
      b.rawPoints - a.rawPoints ||
      a.engineerLogin.localeCompare(b.engineerLogin)
  );

  return {
    repo: inputs.repo,
    windowStart: inputs.windowStart,
    windowEnd: inputs.windowEnd,
    pillar: "delivery",
    engineerScores,
    normalization: {
      minRaw,
      maxRaw,
      method: "minMaxTo100",
    },
    parameters: {
      sizeBuckets: { ...scoring.sizeBucketPoints },
      coreMultiplier: scoring.coreAreaMultiplier,
      featureMultiplier: scoring.featureLabelMultiplier,
    },
  };
}

function determineSizeBucket(
  changedFiles?: number,
  additions?: number,
  deletions?: number
): DeliverySizeBucket {
  const thresholds = appConfig.deliveryScoring.changedFilesThresholds;
  if (typeof changedFiles === "number" && Number.isFinite(changedFiles)) {
    return bucketFromValue(changedFiles, thresholds);
  }

  if (
    typeof additions === "number" &&
    Number.isFinite(additions) &&
    typeof deletions === "number" &&
    Number.isFinite(deletions)
  ) {
    const magnitude = additions + deletions;
    return bucketFromValue(magnitude, appConfig.deliveryScoring.magnitudeThresholds);
  }

  return "s";
}

function bucketFromValue(
  value: number,
  thresholds: { xsMax: number; sMax: number; mMax: number; lMax: number }
): DeliverySizeBucket {
  if (value <= thresholds.xsMax) return "xs";
  if (value <= thresholds.sMax) return "s";
  if (value <= thresholds.mMax) return "m";
  if (value <= thresholds.lMax) return "l";
  return "xl";
}
