import { appConfig } from "@/lib/config/appConfig";
import { labelCategory } from "@/lib/utils/labelMap";
import type {
  CoreAreaResult,
  NormalizedImpactInputs,
  ReliabilityEngineerBreakdown,
  ReliabilityImpactResult,
  ReliabilityPrAttribution,
  ScoreByEngineer,
} from "@/lib/types";

type ScoreReliabilityImpactParams = {
  inputs: NormalizedImpactInputs;
  core: CoreAreaResult | { corePrefixes: string[] };
};

type SeverityLabel = keyof typeof appConfig.reliabilityScoring.severityMultipliers;

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function scoreReliabilityImpact(
  params: ScoreReliabilityImpactParams
): ReliabilityImpactResult {
  const { inputs } = params;
  const scoring = appConfig.reliabilityScoring;
  const corePrefixes = new Set(params.core.corePrefixes);
  const issueNumbers = new Set(inputs.issues.map((issue) => issue.number));
  const byEngineer: ScoreByEngineer<ReliabilityEngineerBreakdown> = {};

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

    const normalizedTitle = pr.title.toLowerCase();
    const labelBugLike = pr.labels.some((label) => {
      const category = labelCategory(label);
      return category === "bug" || category === "regression" || category === "hotfix";
    });
    const titleFixLike = scoring.fixKeywords.some((keyword) =>
      normalizedTitle.includes(keyword)
    );
    const titleRevertLike = scoring.revertKeywords.some((keyword) =>
      normalizedTitle.includes(keyword)
    );
    const issueRefCount = countReferencedIssuesFromTitle(pr.title, issueNumbers);
    const issueReferenceBonusPoints =
      Math.min(issueRefCount, scoring.maxIssueRefBonusPerPr) * scoring.issueReferenceBonus;

    const basePoints =
      (labelBugLike ? scoring.labelTriggerPoints : 0) +
      (titleFixLike ? scoring.titleFixTriggerPoints : 0) +
      (titleRevertLike ? scoring.titleRevertTriggerPoints : 0) +
      issueReferenceBonusPoints;

    if (basePoints === 0) continue;

    const severityLabel = detectSeverityLabel(pr.labels);
    const severityMultiplier = severityLabel
      ? scoring.severityMultipliers[severityLabel] ?? 1
      : 1;

    const coreTouched = Boolean(pr.files?.some((file) => corePrefixes.has(file.prefix)));
    const coreMultiplier = coreTouched ? scoring.coreAreaMultiplier : 1;
    const finalPrPoints = basePoints * severityMultiplier * coreMultiplier;

    const attribution: ReliabilityPrAttribution = {
      prNumber: pr.number,
      prTitle: pr.title,
      prUrl: pr.url,
      mergedAt: pr.mergedAt,
      authorLogin: pr.author.login,
      triggers: {
        labelBugLike,
        titleFixLike,
        titleRevertLike,
        issueRefCount,
        severityLabel,
      },
      basePoints,
      severityMultiplier,
      coreTouched,
      coreMultiplier,
      finalPrPoints,
    };

    const engineerLogin = pr.author.login;
    if (!byEngineer[engineerLogin]) {
      byEngineer[engineerLogin] = {
        engineerLogin,
        prCount: 0,
        rawPoints: 0,
        normalizedScore: 0,
        attributions: [],
      };
    }

    byEngineer[engineerLogin].prCount += 1;
    byEngineer[engineerLogin].rawPoints += finalPrPoints;
    byEngineer[engineerLogin].attributions.push(attribution);
  }

  const engineerScores = Object.values(byEngineer).filter((row) => row.prCount > 0);
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
    pillar: "reliability",
    engineerScores,
    normalization: {
      minRaw,
      maxRaw,
      method: "minMaxTo100",
    },
    parameters: {
      labelTriggerPoints: scoring.labelTriggerPoints,
      titleFixTriggerPoints: scoring.titleFixTriggerPoints,
      titleRevertTriggerPoints: scoring.titleRevertTriggerPoints,
      issueReferenceBonus: scoring.issueReferenceBonus,
      coreMultiplier: scoring.coreAreaMultiplier,
      severityMultipliers: { ...scoring.severityMultipliers },
      fixKeywords: [...scoring.fixKeywords],
      revertKeywords: [...scoring.revertKeywords],
    },
  };
}

function countReferencedIssuesFromTitle(title: string, issueNumbers: Set<number>): number {
  const refs = title.match(/#(\d+)/g) ?? [];
  let count = 0;
  for (const ref of refs) {
    const number = Number(ref.slice(1));
    if (issueNumbers.has(number)) count += 1;
  }
  return count;
}

function detectSeverityLabel(labels: string[]): SeverityLabel | undefined {
  const rules = appConfig.reliabilityScoring.severityRules;
  let best: SeverityLabel | undefined;

  for (const label of labels) {
    const normalized = label.toLowerCase();
    for (const rule of rules) {
      const matched = rule.match.some((token) => normalized.includes(token));
      if (!matched) continue;
      const ruleLabel = rule.label as SeverityLabel;
      if (!best || (SEVERITY_RANK[ruleLabel] ?? 0) > (SEVERITY_RANK[best] ?? 0)) {
        best = ruleLabel;
      }
    }
  }

  return best;
}
