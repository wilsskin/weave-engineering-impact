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

// ── Team Acceleration ──────────────────────────────────────────
export const REVIEW_VOLUME_CAP = 40;
export const TEAM_ACCELERATION_WEIGHTS = {
  volume: 0.5,
  depth: 0.3,
  responsiveness: 0.2,
} as const;

// ── Ownership & Depth ──────────────────────────────────────────
export const SUSTAINED_WEEKS_CAP = 12;
export const OWNERSHIP_WEIGHTS = {
  areaFocus: 0.5,
  sustained: 0.3,
  stewardship: 0.2,
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

// ── Cache settings (placeholder for Sprint 1) ─────────────────
export const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour
export const CACHE_DIR = ".cache";

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
  reliabilityLabels: RELIABILITY_LABELS,
  reliabilityTitleKeywords: RELIABILITY_TITLE_KEYWORDS,
  severityLabels: SEVERITY_LABELS,
  severityMultiplier: SEVERITY_MULTIPLIER,
  bugIssueClosureBonus: BUG_ISSUE_CLOSURE_BONUS,
  reviewVolumeCap: REVIEW_VOLUME_CAP,
  teamAccelerationWeights: TEAM_ACCELERATION_WEIGHTS,
  sustainedWeeksCap: SUSTAINED_WEEKS_CAP,
  ownershipWeights: OWNERSHIP_WEIGHTS,
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
  knownBotLogins: KNOWN_BOT_LOGINS,
  botLoginSuffix: BOT_LOGIN_SUFFIX,
  labelCategoryMap: LABEL_CATEGORY_MAP,
  cacheTtlMs: CACHE_TTL_MS,
  cacheDir: CACHE_DIR,
} as const;
