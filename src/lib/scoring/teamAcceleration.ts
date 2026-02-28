import { appConfig } from "@/lib/config/appConfig";
import type {
  NormalizedImpactInputs,
  PullRequestLite,
  ReviewContribution,
  ReviewLite,
  TeamAccelerationEngineerBreakdown,
  TeamAccelerationImpactResult,
} from "@/lib/types";

type ScoreTeamAccelerationParams = {
  inputs: NormalizedImpactInputs;
};

export function scoreTeamAccelerationImpact(
  params: ScoreTeamAccelerationParams
): TeamAccelerationImpactResult {
  const { inputs } = params;
  const scoring = appConfig.teamAccelerationScoring;

  const prByNumber = new Map<number, PullRequestLite>();
  for (const pr of inputs.pullRequests) {
    prByNumber.set(pr.number, pr);
  }

  const eligible = filterEligibleReviews(inputs.reviews, prByNumber);

  const firstReviewByPr = determineFirstReviews(eligible, prByNumber);

  const byEngineer = new Map<string, {
    contributions: ReviewContribution[];
    firstResponseHours: number[];
  }>();

  for (const review of eligible) {
    const pr = prByNumber.get(review.prNumber)!;
    const firstInfo = firstReviewByPr.get(review.prNumber);
    const isFirst = firstInfo?.reviewerLogin === review.reviewer.login;

    const depthScore = computeDepthScore(review.bodyLength, scoring.shortReviewLength, scoring.longReviewLength);

    let basePoints = scoring.reviewBasePoints;
    let firstBonus = 0;
    let responsivenessComponent = 0;
    let responseTimeHours: number | undefined;

    if (isFirst) {
      firstBonus = scoring.firstReviewBonus;
      responseTimeHours = firstInfo?.responseTimeHours;

      if (responseTimeHours !== undefined) {
        if (responseTimeHours <= scoring.fastResponseHours) {
          responsivenessComponent = scoring.responsivenessWeight * 1;
        } else if (responseTimeHours <= scoring.mediumResponseHours) {
          responsivenessComponent = scoring.responsivenessWeight * 0.5;
        }
      }
    }

    const finalPoints =
      basePoints +
      firstBonus +
      scoring.depthWeight * depthScore +
      responsivenessComponent;

    const contribution: ReviewContribution = {
      prNumber: review.prNumber,
      prTitle: pr.title,
      prUrl: pr.url,
      reviewerLogin: review.reviewer.login,
      submittedAt: review.submittedAt,
      isFirstReviewOnPr: isFirst,
      responseTimeHours,
      depthScore,
      basePoints,
      finalPoints,
    };

    let engineerData = byEngineer.get(review.reviewer.login);
    if (!engineerData) {
      engineerData = { contributions: [], firstResponseHours: [] };
      byEngineer.set(review.reviewer.login, engineerData);
    }
    engineerData.contributions.push(contribution);
    if (isFirst && responseTimeHours !== undefined) {
      engineerData.firstResponseHours.push(responseTimeHours);
    }
  }

  const engineerScores: TeamAccelerationEngineerBreakdown[] = [];

  for (const [login, data] of byEngineer) {
    const reviewCount = data.contributions.length;
    const firstReviewCount = data.contributions.filter((c) => c.isFirstReviewOnPr).length;
    const rawPoints = data.contributions.reduce((sum, c) => sum + c.finalPoints, 0);
    const medianResponseHours =
      data.firstResponseHours.length > 0
        ? computeMedian(data.firstResponseHours)
        : undefined;

    data.contributions.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    const cappedContributions = data.contributions.slice(0, scoring.maxContributionsPerEngineer);

    engineerScores.push({
      engineerLogin: login,
      reviewCount,
      firstReviewCount,
      medianResponseHours,
      rawPoints,
      normalizedScore: 0,
      contributions: cappedContributions,
    });
  }

  const withPoints = engineerScores.filter((e) => e.rawPoints > 0);
  let minRaw = 0;
  let maxRaw = 0;

  if (withPoints.length > 0) {
    minRaw = Math.min(...withPoints.map((e) => e.rawPoints));
    maxRaw = Math.max(...withPoints.map((e) => e.rawPoints));
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
    pillar: "teamAcceleration",
    engineerScores,
    normalization: { minRaw, maxRaw, method: "minMaxTo100" },
    parameters: {
      reviewBasePoints: scoring.reviewBasePoints,
      firstReviewBonus: scoring.firstReviewBonus,
      depthWeight: scoring.depthWeight,
      responsivenessWeight: scoring.responsivenessWeight,
      shortReviewLength: scoring.shortReviewLength,
      longReviewLength: scoring.longReviewLength,
      fastResponseHours: scoring.fastResponseHours,
      mediumResponseHours: scoring.mediumResponseHours,
    },
  };
}

function filterEligibleReviews(
  reviews: ReviewLite[],
  prByNumber: Map<number, PullRequestLite>
): ReviewLite[] {
  const botLogins = appConfig.knownBotLogins;
  const botSuffix = appConfig.botLoginSuffix;

  return reviews.filter((review) => {
    if (!review.submittedAt) return false;

    const pr = prByNumber.get(review.prNumber);
    if (!pr) return false;

    const reviewerLogin = review.reviewer.login;
    if (!reviewerLogin?.trim()) return false;

    if (review.reviewer.isBot) return false;
    const lowerLogin = reviewerLogin.toLowerCase();
    if (botLogins.has(lowerLogin)) return false;
    if (lowerLogin.endsWith(`[${botSuffix}]`)) return false;
    if (lowerLogin.endsWith(botSuffix) && lowerLogin !== botSuffix) return false;

    if (pr.author?.login && reviewerLogin === pr.author.login) return false;

    return true;
  });
}

function determineFirstReviews(
  eligible: ReviewLite[],
  prByNumber: Map<number, PullRequestLite>
): Map<number, { reviewerLogin: string; responseTimeHours?: number }> {
  const reviewsByPr = new Map<number, ReviewLite[]>();
  for (const review of eligible) {
    let list = reviewsByPr.get(review.prNumber);
    if (!list) {
      list = [];
      reviewsByPr.set(review.prNumber, list);
    }
    list.push(review);
  }

  const result = new Map<number, { reviewerLogin: string; responseTimeHours?: number }>();

  for (const [prNumber, reviews] of reviewsByPr) {
    reviews.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    const first = reviews[0];
    const pr = prByNumber.get(prNumber)!;

    let responseTimeHours: number | undefined;
    if (pr.createdAt) {
      const createdMs = Date.parse(pr.createdAt);
      const submittedMs = Date.parse(first.submittedAt);
      if (Number.isFinite(createdMs) && Number.isFinite(submittedMs)) {
        const diffMs = submittedMs - createdMs;
        responseTimeHours = Math.max(0, diffMs / (1000 * 60 * 60));
      }
    }

    result.set(prNumber, {
      reviewerLogin: first.reviewer.login,
      responseTimeHours,
    });
  }

  return result;
}

function computeDepthScore(
  bodyLength: number,
  shortLen: number,
  longLen: number
): number {
  if (bodyLength >= longLen) return 1;
  if (bodyLength >= shortLen) return 0.5;
  return 0;
}

function computeMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}
