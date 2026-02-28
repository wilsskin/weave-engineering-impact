import { appConfig } from "@/lib/config/appConfig";
import { labelCategory } from "@/lib/utils/labelMap";
import type {
  ExecutionQualityEngineerBreakdown,
  ExecutionQualityImpactResult,
  NormalizedImpactInputs,
  PullRequestLite,
} from "@/lib/types";

type ScoreExecutionQualityParams = {
  inputs: NormalizedImpactInputs;
};

interface PreparedPr {
  number: number;
  authorLogin: string;
  mergedAtMs: number;
  title: string;
  labels: string[];
  primaryPrefix: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function scoreExecutionQualityImpact(
  params: ScoreExecutionQualityParams
): ExecutionQualityImpactResult {
  const { inputs } = params;
  const scoring = appConfig.executionQualityScoring;

  // A) Prep: build PR maps
  const prepared: PreparedPr[] = [];
  const prByNumber = new Map<number, PreparedPr>();

  for (const pr of inputs.pullRequests) {
    if (!pr.mergedAt) continue;
    if (!pr.author?.login?.trim()) continue;
    if (pr.author.isBot) continue;

    const mergedAtMs = Date.parse(pr.mergedAt);
    if (!Number.isFinite(mergedAtMs)) continue;

    const p: PreparedPr = {
      number: pr.number,
      authorLogin: pr.author.login,
      mergedAtMs,
      title: pr.title,
      labels: pr.labels,
      primaryPrefix: determinePrimaryPrefix(pr),
    };

    prepared.push(p);
    prByNumber.set(pr.number, p);
  }

  // Group by author, sorted by mergedAt ascending
  const prsByAuthor = new Map<string, PreparedPr[]>();
  for (const p of prepared) {
    let list = prsByAuthor.get(p.authorLogin);
    if (!list) {
      list = [];
      prsByAuthor.set(p.authorLogin, list);
    }
    list.push(p);
  }
  for (const list of prsByAuthor.values()) {
    list.sort((a, b) => a.mergedAtMs - b.mergedAtMs);
  }

  // F) Review churn: count CHANGES_REQUESTED per PR
  const changesRequestedByPr = new Map<number, number>();
  for (const review of inputs.reviews) {
    if (review.state !== "CHANGES_REQUESTED") continue;
    if (review.reviewer.isBot) continue;

    const prInfo = prByNumber.get(review.prNumber);
    if (!prInfo) continue;

    // Exclude self reviews
    if (review.reviewer.login === prInfo.authorLogin) continue;

    changesRequestedByPr.set(
      review.prNumber,
      (changesRequestedByPr.get(review.prNumber) ?? 0) + 1
    );
  }

  // Per-engineer penalty computation
  const engineerScores: ExecutionQualityEngineerBreakdown[] = [];

  for (const [login, authorPrs] of prsByAuthor) {
    // D) Follow-up fix detection
    let followUpFixCount = 0;
    for (let i = 0; i < authorPrs.length; i++) {
      const pri = authorPrs[i];
      if (!isBugLike(pri, scoring.fixKeywords)) continue;

      for (let j = i - 1; j >= 0; j--) {
        const prj = authorPrs[j];
        if (prj.primaryPrefix !== pri.primaryPrefix) continue;
        const daysDiff = (pri.mergedAtMs - prj.mergedAtMs) / MS_PER_DAY;
        if (daysDiff <= scoring.followUpFixWindowDays) {
          followUpFixCount++;
          break;
        }
        if (daysDiff > scoring.followUpFixWindowDays) break;
      }
    }

    // E) Revert detection
    let revertCount = 0;
    for (let i = 0; i < authorPrs.length; i++) {
      const pri = authorPrs[i];
      if (!isRevertLike(pri, scoring.revertKeywords)) continue;

      // Check if title references a specific PR number
      const referencedPrNumber = extractReferencedPrNumber(pri.title);
      if (referencedPrNumber !== undefined && prByNumber.has(referencedPrNumber)) {
        const refPr = prByNumber.get(referencedPrNumber)!;
        const daysDiff = (pri.mergedAtMs - refPr.mergedAtMs) / MS_PER_DAY;
        if (daysDiff >= 0 && daysDiff <= scoring.revertWindowDays) {
          revertCount++;
          continue;
        }
      }

      // Fallback: same prefix within window
      for (let j = i - 1; j >= 0; j--) {
        const prj = authorPrs[j];
        if (prj.primaryPrefix !== pri.primaryPrefix) continue;
        const daysDiff = (pri.mergedAtMs - prj.mergedAtMs) / MS_PER_DAY;
        if (daysDiff <= scoring.revertWindowDays) {
          revertCount++;
          break;
        }
        if (daysDiff > scoring.revertWindowDays) break;
      }
    }

    // F) Churn count
    let churnPrCount = 0;
    for (const pr of authorPrs) {
      const crCount = changesRequestedByPr.get(pr.number) ?? 0;
      if (crCount > scoring.churnThresholdChangesRequested) {
        churnPrCount++;
      }
    }

    // G) Penalty calculation
    const followUpFixPenalty = followUpFixCount * scoring.followUpFixPenaltyPoints;
    const revertPenalty = revertCount * scoring.revertPenaltyPoints;
    const churnPenalty = churnPrCount * scoring.churnPenaltyPoints;
    const totalPenalty = Math.min(
      scoring.maxTotalPenalty,
      followUpFixPenalty + revertPenalty + churnPenalty
    );
    const finalRawScore = Math.max(0, scoring.startingScore - totalPenalty);

    engineerScores.push({
      engineerLogin: login,
      startingScore: scoring.startingScore,
      penalties: {
        followUpFixPenalty,
        revertPenalty,
        churnPenalty,
        totalPenalty,
      },
      evidence: {
        followUpFixCount,
        revertCount,
        churnPrCount,
      },
      finalRawScore,
      normalizedScore: 0,
    });
  }

  // H) Min-max normalization to 0-100
  const withScore = engineerScores.filter((e) => e.finalRawScore > 0);
  let minRaw = 0;
  let maxRaw = 0;

  if (withScore.length > 0) {
    minRaw = Math.min(...withScore.map((e) => e.finalRawScore));
    maxRaw = Math.max(...withScore.map((e) => e.finalRawScore));
  }

  if (withScore.length === 1 || maxRaw === minRaw) {
    for (const engineer of engineerScores) {
      engineer.normalizedScore = engineer.finalRawScore > 0 ? 100 : 0;
    }
  } else {
    for (const engineer of engineerScores) {
      if (engineer.finalRawScore <= 0) {
        engineer.normalizedScore = 0;
        continue;
      }
      engineer.normalizedScore =
        ((engineer.finalRawScore - minRaw) / (maxRaw - minRaw)) * 100;
    }
  }

  engineerScores.sort(
    (a, b) =>
      b.normalizedScore - a.normalizedScore ||
      b.finalRawScore - a.finalRawScore ||
      a.engineerLogin.localeCompare(b.engineerLogin)
  );

  return {
    repo: inputs.repo,
    windowStart: inputs.windowStart,
    windowEnd: inputs.windowEnd,
    pillar: "executionQuality",
    engineerScores,
    normalization: { minRaw, maxRaw, method: "minMaxTo100" },
    parameters: {
      startingScore: scoring.startingScore,
      followUpFixWindowDays: scoring.followUpFixWindowDays,
      revertWindowDays: scoring.revertWindowDays,
      followUpFixPenaltyPoints: scoring.followUpFixPenaltyPoints,
      revertPenaltyPoints: scoring.revertPenaltyPoints,
      churnPenaltyPoints: scoring.churnPenaltyPoints,
      churnThresholdChangesRequested: scoring.churnThresholdChangesRequested,
      maxTotalPenalty: scoring.maxTotalPenalty,
      fixKeywords: [...scoring.fixKeywords],
      revertKeywords: [...scoring.revertKeywords],
    },
  };
}

function determinePrimaryPrefix(pr: PullRequestLite): string {
  if (!pr.files || pr.files.length === 0) return "unknown";

  const prefixCounts = new Map<string, number>();
  for (const file of pr.files) {
    prefixCounts.set(file.prefix, (prefixCounts.get(file.prefix) ?? 0) + 1);
  }

  let bestPrefix = "unknown";
  let bestCount = 0;
  for (const [prefix, count] of prefixCounts) {
    if (count > bestCount || (count === bestCount && prefix < bestPrefix)) {
      bestPrefix = prefix;
      bestCount = count;
    }
  }
  return bestPrefix;
}

function isBugLike(pr: PreparedPr, fixKeywords: readonly string[]): boolean {
  const hasBugLabel = pr.labels.some((label) => {
    const cat = labelCategory(label);
    return cat === "bug" || cat === "regression" || cat === "hotfix";
  });
  if (hasBugLabel) return true;

  const lowerTitle = pr.title.toLowerCase();
  return fixKeywords.some((kw) => lowerTitle.includes(kw));
}

function isRevertLike(pr: PreparedPr, revertKeywords: readonly string[]): boolean {
  const lowerTitle = pr.title.toLowerCase();
  return revertKeywords.some((kw) => lowerTitle.includes(kw));
}

function extractReferencedPrNumber(title: string): number | undefined {
  const match = title.match(/#(\d+)/);
  if (!match) return undefined;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : undefined;
}
