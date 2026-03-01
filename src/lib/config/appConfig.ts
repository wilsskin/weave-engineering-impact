/**
 * Single source of truth for all application constants.
 * Scoring weights, thresholds, and heuristic parameters live here
 * so downstream modules never hard-code magic numbers.
 */

import type { RepoRef } from "@/lib/types";

// ── Repository defaults ────────────────────────────────────────
export const DEFAULT_REPO_OWNER = "PostHog";
export const DEFAULT_REPO_NAME = "posthog";
export const DEFAULT_REPO: RepoRef = {
  owner: DEFAULT_REPO_OWNER,
  repo: DEFAULT_REPO_NAME,
};

// ── Time window ────────────────────────────────────────────────
export const TIME_WINDOW_DAYS = 90;

// ── Core area identification ───────────────────────────────────
export const CORE_AREA_TOP_PERCENT = 20;
export const CORE_AREA_MULTIPLIER = 1.25;
export const CORE_SCORE_WEIGHTS = {
  prFrequency: 0.5,
  distinctContributors: 0.3,
  bugLabeledPrShare: 0.2,
} as const;

// ── Pillar weights (must sum to 1.0) ───────────────────────────
export const PILLAR_WEIGHTS = {
  delivery: 0.3,
  reliability: 0.2,
  teamAcceleration: 0.2,
  ownership: 0.15,
  executionQuality: 0.15,
} as const;

// ── Delivery Impact ────────────────────────────────────────────
export const PR_SIZE_BUCKETS: { maxFiles: number; weight: number }[] = [
  { maxFiles: 2, weight: 0.5 },
  { maxFiles: 5, weight: 1.0 },
  { maxFiles: 15, weight: 1.5 },
  { maxFiles: 40, weight: 2.0 },
  { maxFiles: Infinity, weight: 2.0 },
];

export const FEATURE_LABELS = new Set([
  "feature",
  "enhancement",
  "frontend",
  "backend",
]);
export const FEATURE_MULTIPLIER = 1.15;

export const DELIVERY_SCORING = {
  changedFilesThresholds: {
    xsMax: 1,
    sMax: 4,
    mMax: 9,
    lMax: 19,
  },
  // Fallback when changedFiles is missing; uses additions+deletions magnitude.
  magnitudeThresholds: {
    xsMax: 50,
    sMax: 200,
    mMax: 600,
    lMax: 1500,
  },
  sizeBucketPoints: {
    xs: 1,
    s: 2,
    m: 4,
    l: 7,
    xl: 10,
  },
  coreAreaMultiplier: 1.25,
  featureLabelMultiplier: 1.15,
  maxAttributionsPerEngineer: 50,
} as const;

// ── Reliability & Crisis Response ──────────────────────────────
export const RELIABILITY_LABELS = new Set([
  "bug",
  "regression",
  "hotfix",
  "incident",
  "performance",
]);
export const RELIABILITY_TITLE_KEYWORDS = ["fix", "revert", "regression"];
export const SEVERITY_LABELS = new Set([
  "hotfix",
  "regression",
  "incident",
  "revert",
]);
export const SEVERITY_MULTIPLIER = 1.5;
export const BUG_ISSUE_CLOSURE_BONUS = 0.5;

export const RELIABILITY_SCORING = {
  labelTriggerPoints: 5,
  titleFixTriggerPoints: 2,
  titleRevertTriggerPoints: 3,
  issueReferenceBonus: 1,
  maxIssueRefBonusPerPr: 3,
  coreAreaMultiplier: 1.2,
  severityMultipliers: {
    critical: 1.6,
    high: 1.3,
    medium: 1.1,
    low: 1.0,
  },
  severityRules: [
    { label: "critical", match: ["p0", "sev0", "critical"] },
    { label: "high", match: ["p1", "sev1", "high"] },
    { label: "medium", match: ["p2", "sev2", "medium"] },
    { label: "low", match: ["p3", "sev3", "low"] },
  ],
  fixKeywords: ["fix", "hotfix", "bug", "regression"],
  revertKeywords: ["revert", "rollback"],
  maxAttributionsPerEngineer: DELIVERY_SCORING.maxAttributionsPerEngineer,
} as const;

// ── Team Acceleration ──────────────────────────────────────────
export const REVIEW_VOLUME_CAP = 40;
export const TEAM_ACCELERATION_WEIGHTS = {
  volume: 0.5,
  depth: 0.3,
  responsiveness: 0.2,
} as const;

export const TEAM_ACCELERATION_SCORING = {
  reviewBasePoints: 1.0,
  firstReviewBonus: 1.5,
  depthWeight: 0.5,
  responsivenessWeight: 0.5,
  shortReviewLength: 20,
  longReviewLength: 200,
  fastResponseHours: 24,
  mediumResponseHours: 72,
  maxContributionsPerEngineer: DELIVERY_SCORING.maxAttributionsPerEngineer,
} as const;

// ── Ownership & Depth ──────────────────────────────────────────
export const SUSTAINED_WEEKS_CAP = 12;
export const OWNERSHIP_WEIGHTS = {
  areaFocus: 0.5,
  sustained: 0.3,
  stewardship: 0.2,
} as const;

export const OWNERSHIP_SCORING = {
  minPrsForOwnership: 3,
  focusWeight: 0.50,
  consistencyWeight: 0.30,
  reviewInAreaWeight: 0.20,
  maxActiveWeeks: 13,
  minFocusRatio: 0.40,
  reviewsInOwnedAreaCap: 20,
} as const;

// ── Execution Quality ──────────────────────────────────────────
export const EXECUTION_BASE_SCORE = 100;
export const FOLLOW_UP_FIX_WINDOW_DAYS = 14;
export const FOLLOW_UP_FIX_PENALTY = -10;
export const FOLLOW_UP_FIX_PENALTY_CAP = -40;
export const REVERT_WINDOW_DAYS = 30;
export const REVERT_PENALTY = -20;
export const REVERT_PENALTY_CAP = -40;
export const REVIEW_CHURN_THRESHOLD = 2;
export const REVIEW_CHURN_PENALTY = -5;
export const REVIEW_CHURN_PENALTY_CAP = -20;

export const EXECUTION_QUALITY_SCORING = {
  startingScore: 100,
  followUpFixWindowDays: 14,
  revertWindowDays: 30,
  followUpFixPenaltyPoints: 6,
  revertPenaltyPoints: 10,
  churnPenaltyPoints: 4,
  churnThresholdChangesRequested: 2,
  maxTotalPenalty: 60,
  fixKeywords: ["fix", "hotfix", "bug", "regression"],
  revertKeywords: ["revert", "rollback"],
} as const;

// ── Bot exclusion ──────────────────────────────────────────────
export const KNOWN_BOT_LOGINS = new Set([
  "dependabot[bot]",
  "dependabot-preview[bot]",
  "renovate[bot]",
  "github-actions[bot]",
  "codecov[bot]",
  "stale[bot]",
  "posthog-bot",
  "mergify[bot]",
  "snyk-bot",
  "greenkeeper[bot]",
]);
export const BOT_LOGIN_SUFFIX = "bot";

// ── Label mapping defaults ─────────────────────────────────────
export const LABEL_CATEGORY_MAP: Record<string, LabelCategory> = {
  feature: "feature",
  enhancement: "feature",
  "new feature": "feature",
  feat: "feature",
  bug: "bug",
  "bug fix": "bug",
  bugfix: "bug",
  regression: "regression",
  hotfix: "hotfix",
  "hot fix": "hotfix",
  incident: "hotfix",
  chore: "chore",
  maintenance: "chore",
  ci: "chore",
  docs: "chore",
  refactor: "chore",
  test: "chore",
  tests: "chore",
};

export type LabelCategory =
  | "feature"
  | "bug"
  | "regression"
  | "hotfix"
  | "chore"
  | "unknown";

// ── Cache settings ─────────────────────────────────────────────
export const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
/** Committed to git so deployed app (e.g. Vercel) can serve cached data. */
export const CACHE_DIR = "data/impact-dashboard-cache";
export const CACHE_VERSION = "v1";

// ── Refresh cooldown ───────────────────────────────────────────
export const REFRESH_COOLDOWN_SECONDS = 60;

// ── API budget management ──────────────────────────────────────
/** Max PRs to enrich with detail/files/reviews calls (3 calls each). */
export const MAX_PR_ENRICHMENT = 500;
/** Minimum rate-limit remaining required before starting enrichment. */
export const MIN_RATE_LIMIT_BUDGET = 200;

// ── Aggregate config object ────────────────────────────────────
export const appConfig = {
  repo: DEFAULT_REPO,
  timeWindowDays: TIME_WINDOW_DAYS,
  coreAreaTopPercent: CORE_AREA_TOP_PERCENT,
  coreAreaMultiplier: CORE_AREA_MULTIPLIER,
  coreScoreWeights: CORE_SCORE_WEIGHTS,
  pillarWeights: PILLAR_WEIGHTS,
  prSizeBuckets: PR_SIZE_BUCKETS,
  featureLabels: FEATURE_LABELS,
  featureMultiplier: FEATURE_MULTIPLIER,
  deliveryScoring: DELIVERY_SCORING,
  reliabilityLabels: RELIABILITY_LABELS,
  reliabilityTitleKeywords: RELIABILITY_TITLE_KEYWORDS,
  severityLabels: SEVERITY_LABELS,
  severityMultiplier: SEVERITY_MULTIPLIER,
  bugIssueClosureBonus: BUG_ISSUE_CLOSURE_BONUS,
  reliabilityScoring: RELIABILITY_SCORING,
  reviewVolumeCap: REVIEW_VOLUME_CAP,
  teamAccelerationWeights: TEAM_ACCELERATION_WEIGHTS,
  teamAccelerationScoring: TEAM_ACCELERATION_SCORING,
  sustainedWeeksCap: SUSTAINED_WEEKS_CAP,
  ownershipWeights: OWNERSHIP_WEIGHTS,
  ownershipScoring: OWNERSHIP_SCORING,
  executionBaseScore: EXECUTION_BASE_SCORE,
  followUpFixWindowDays: FOLLOW_UP_FIX_WINDOW_DAYS,
  followUpFixPenalty: FOLLOW_UP_FIX_PENALTY,
  followUpFixPenaltyCap: FOLLOW_UP_FIX_PENALTY_CAP,
  revertWindowDays: REVERT_WINDOW_DAYS,
  revertPenalty: REVERT_PENALTY,
  revertPenaltyCap: REVERT_PENALTY_CAP,
  reviewChurnThreshold: REVIEW_CHURN_THRESHOLD,
  reviewChurnPenalty: REVIEW_CHURN_PENALTY,
  reviewChurnPenaltyCap: REVIEW_CHURN_PENALTY_CAP,
  executionQualityScoring: EXECUTION_QUALITY_SCORING,
  knownBotLogins: KNOWN_BOT_LOGINS,
  botLoginSuffix: BOT_LOGIN_SUFFIX,
  labelCategoryMap: LABEL_CATEGORY_MAP,
  cacheTtlMs: CACHE_TTL_MS,
  cacheDir: CACHE_DIR,
  cacheVersion: CACHE_VERSION,
  refreshCooldownSeconds: REFRESH_COOLDOWN_SECONDS,
  maxPrEnrichment: MAX_PR_ENRICHMENT,
  minRateLimitBudget: MIN_RATE_LIMIT_BUDGET,
} as const;
