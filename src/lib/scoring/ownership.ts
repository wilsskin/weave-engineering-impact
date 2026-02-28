import { appConfig } from "@/lib/config/appConfig";
import type {
  NormalizedImpactInputs,
  OwnershipAttribution,
  OwnershipEngineerBreakdown,
  OwnershipImpactResult,
  PullRequestLite,
} from "@/lib/types";

type ScoreOwnershipImpactParams = {
  inputs: NormalizedImpactInputs;
};

export function scoreOwnershipImpact(
  params: ScoreOwnershipImpactParams
): OwnershipImpactResult {
  const { inputs } = params;
  const scoring = appConfig.ownershipScoring;

  // A) Per-engineer prefix PR counts + PR primary prefix map
  const engineerPrefixCounts = new Map<string, Map<string, number>>();
  const engineerTotalPrs = new Map<string, number>();
  const prPrimaryPrefix = new Map<number, string>();
  const prAuthorLogin = new Map<number, string>();
  const engineerWeekKeys = new Map<string, Set<string>>();

  for (const pr of inputs.pullRequests) {
    if (!pr.mergedAt) continue;
    if (!pr.author?.login?.trim()) continue;
    if (pr.author.isBot) continue;
    if (!pr.files || pr.files.length === 0) continue;

    const login = pr.author.login;
    const primaryPrefix = determinePrimaryPrefix(pr);
    prPrimaryPrefix.set(pr.number, primaryPrefix);
    prAuthorLogin.set(pr.number, login);

    // Increment prefix counts for this engineer
    let prefixMap = engineerPrefixCounts.get(login);
    if (!prefixMap) {
      prefixMap = new Map();
      engineerPrefixCounts.set(login, prefixMap);
    }
    prefixMap.set(primaryPrefix, (prefixMap.get(primaryPrefix) ?? 0) + 1);
    engineerTotalPrs.set(login, (engineerTotalPrs.get(login) ?? 0) + 1);

    // C) Track distinct active weeks (UTC ISO week from mergedAt)
    const weekKey = isoWeekKey(pr.mergedAt);
    if (weekKey) {
      let weeks = engineerWeekKeys.get(login);
      if (!weeks) {
        weeks = new Set();
        engineerWeekKeys.set(login, weeks);
      }
      weeks.add(weekKey);
    }
  }

  // B) Determine ownedPrefix per engineer
  const engineerOwned = new Map<string, {
    ownedPrefix: string;
    ownedAreaPrCount: number;
    totalPrCount: number;
    focusRatio: number;
  }>();

  for (const [login, prefixMap] of engineerPrefixCounts) {
    const totalPrCount = engineerTotalPrs.get(login) ?? 0;
    if (totalPrCount < scoring.minPrsForOwnership) continue;

    let bestPrefix = "";
    let bestCount = 0;
    for (const [prefix, count] of prefixMap) {
      if (count > bestCount || (count === bestCount && prefix < bestPrefix)) {
        bestPrefix = prefix;
        bestCount = count;
      }
    }

    engineerOwned.set(login, {
      ownedPrefix: bestPrefix,
      ownedAreaPrCount: bestCount,
      totalPrCount,
      focusRatio: bestCount / totalPrCount,
    });
  }

  // D) Reviews in owned area
  const engineerReviewsInArea = new Map<string, number>();

  for (const review of inputs.reviews) {
    const reviewerLogin = review.reviewer.login;
    if (!reviewerLogin?.trim()) continue;
    if (review.reviewer.isBot) continue;

    const prPrefix = prPrimaryPrefix.get(review.prNumber);
    if (prPrefix === undefined) continue;

    const prAuthor = prAuthorLogin.get(review.prNumber);
    if (prAuthor && reviewerLogin === prAuthor) continue;

    const owned = engineerOwned.get(reviewerLogin);
    if (!owned) continue;

    if (prPrefix === owned.ownedPrefix) {
      engineerReviewsInArea.set(
        reviewerLogin,
        (engineerReviewsInArea.get(reviewerLogin) ?? 0) + 1
      );
    }
  }

  // E + F) Component scoring and weighted raw points
  const engineerScores: OwnershipEngineerBreakdown[] = [];

  for (const [login, owned] of engineerOwned) {
    const activeWeeks = Math.min(
      engineerWeekKeys.get(login)?.size ?? 0,
      scoring.maxActiveWeeks
    );
    const reviewsInOwnedArea = engineerReviewsInArea.get(login) ?? 0;

    // Focus points: scale down below minFocusRatio
    let focusPoints: number;
    if (owned.focusRatio >= scoring.minFocusRatio) {
      focusPoints = Math.min(owned.focusRatio, 1);
    } else {
      focusPoints = owned.focusRatio / scoring.minFocusRatio;
    }

    const consistencyPoints = activeWeeks / scoring.maxActiveWeeks;

    const reviewsInOwnedAreaNorm =
      Math.min(reviewsInOwnedArea, scoring.reviewsInOwnedAreaCap) /
      scoring.reviewsInOwnedAreaCap;

    const rawPointsUnit =
      scoring.focusWeight * focusPoints +
      scoring.consistencyWeight * consistencyPoints +
      scoring.reviewInAreaWeight * reviewsInOwnedAreaNorm;

    const rawPoints = rawPointsUnit * 100;

    const attribution: OwnershipAttribution = {
      engineerLogin: login,
      ownedPrefix: owned.ownedPrefix,
      totalPrCount: owned.totalPrCount,
      ownedAreaPrCount: owned.ownedAreaPrCount,
      focusRatio: owned.focusRatio,
      activeWeeks,
      reviewsInOwnedArea,
      components: {
        focusPoints,
        consistencyPoints,
        reviewInAreaPoints: reviewsInOwnedAreaNorm,
      },
      rawPoints,
    };

    engineerScores.push({
      engineerLogin: login,
      ownedPrefix: owned.ownedPrefix,
      totalPrCount: owned.totalPrCount,
      ownedAreaPrCount: owned.ownedAreaPrCount,
      focusRatio: owned.focusRatio,
      activeWeeks,
      reviewsInOwnedArea,
      rawPoints,
      normalizedScore: 0,
      attribution,
    });
  }

  // G) Min-max normalization to 0-100
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
    pillar: "ownership",
    engineerScores,
    normalization: { minRaw, maxRaw, method: "minMaxTo100" },
    parameters: {
      minPrsForOwnership: scoring.minPrsForOwnership,
      focusWeight: scoring.focusWeight,
      consistencyWeight: scoring.consistencyWeight,
      reviewInAreaWeight: scoring.reviewInAreaWeight,
      maxActiveWeeks: scoring.maxActiveWeeks,
    },
  };
}

/**
 * Determines the primary prefix for a PR by finding the most frequent
 * prefix among its files. Ties broken alphabetically.
 */
function determinePrimaryPrefix(pr: PullRequestLite): string {
  const prefixCounts = new Map<string, number>();
  for (const file of pr.files ?? []) {
    prefixCounts.set(file.prefix, (prefixCounts.get(file.prefix) ?? 0) + 1);
  }

  let bestPrefix = "";
  let bestCount = 0;
  for (const [prefix, count] of prefixCounts) {
    if (count > bestCount || (count === bestCount && prefix < bestPrefix)) {
      bestPrefix = prefix;
      bestCount = count;
    }
  }
  return bestPrefix;
}

/**
 * Returns an ISO-week key like "2025-W03" from an ISO date string (UTC).
 */
function isoWeekKey(dateStr: string): string | undefined {
  const ms = Date.parse(dateStr);
  if (!Number.isFinite(ms)) return undefined;

  const d = new Date(ms);
  const dayOfWeek = d.getUTCDay() || 7; // Mon=1 ... Sun=7
  // Set to nearest Thursday (ISO week date definition)
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
