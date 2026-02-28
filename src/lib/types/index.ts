/**
 * Shared type contracts for the Engineering Impact Dashboard.
 * Every downstream sprint imports from here — keep lean and stable.
 */

// ── Repository reference ───────────────────────────────────────
export interface RepoRef {
  owner: string;
  repo: string;
}

// ── Actor (GitHub user) ────────────────────────────────────────
export interface Actor {
  login: string;
  id: number;
  type: string;
  isBot: boolean;
}

// ── Engineer identity key ──────────────────────────────────────
export interface EngineerKey {
  login: string;
}

// ── File path (lightweight) ────────────────────────────────────
export interface FilePathLite {
  path: string;
  prefix: string;
  extension: string;
}

// ── Pull request (lightweight) ─────────────────────────────────
export interface PullRequestLite {
  id: number;
  number: number;
  title: string;
  author: Actor;
  createdAt: string;
  mergedAt: string;
  closedAt: string;
  url: string;
  additions?: number;
  deletions?: number;
  changedFiles?: number;
  labels: string[];
  files?: FilePathLite[];
}

// ── Review (lightweight) ───────────────────────────────────────
export interface ReviewLite {
  id: number;
  prNumber: number;
  reviewer: Actor;
  state: string;
  submittedAt: string;
  bodyLength: number;
  commentCount?: number;
}

// ── Issue (lightweight) ────────────────────────────────────────
export interface IssueLite {
  id: number;
  number: number;
  title: string;
  author: Actor;
  createdAt: string;
  closedAt?: string;
  labels: string[];
  url: string;
}

// ── Normalized input container for scoring pipelines ───────────
export interface NormalizedImpactInputs {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  pullRequests: PullRequestLite[];
  reviews: ReviewLite[];
  issues: IssueLite[];
  /** Tracks incremental enrichment progress across cascading fetches */
  fetchProgress?: {
    totalPrsInWindow: number;
    enrichedPrNumbers: number[];
    issuesFetched: boolean;
  };
}

// ── Core area identification (Sprint 2) ────────────────────────

export interface PrefixStats {
  prefix: string;
  prCount: number;
  distinctAuthors: number;
  bugPrCount: number;
  bugShare: number;
  coreScore: number;
}

export interface CoreAreaResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  /** Percentage threshold used for selection (0–100) */
  topPercent: number;
  /** Prefix strings selected as core areas */
  corePrefixes: string[];
  /** All prefix stats sorted by coreScore descending */
  stats: PrefixStats[];
}

// ── Shared score map helper ─────────────────────────────────────
export type ScoreByEngineer<T> = Record<string, T>;

// ── Delivery Impact (Sprint 3A) ─────────────────────────────────
export type DeliverySizeBucket = "xs" | "s" | "m" | "l" | "xl";

export interface DeliveryPrAttribution {
  prNumber: number;
  prTitle: string;
  prUrl: string;
  mergedAt: string;
  authorLogin: string;
  sizeBucket: DeliverySizeBucket;
  sizePoints: number;
  isCoreTouched: boolean;
  coreMultiplier: number;
  hasFeatureLabel: boolean;
  featureMultiplier: number;
  finalPrPoints: number;
}

export interface DeliveryEngineerBreakdown {
  engineerLogin: string;
  prCount: number;
  rawPoints: number;
  normalizedScore: number;
  attributions: DeliveryPrAttribution[];
}

export interface DeliveryImpactResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  pillar: "delivery";
  engineerScores: DeliveryEngineerBreakdown[];
  normalization: {
    minRaw: number;
    maxRaw: number;
    method: "minMaxTo100";
  };
  parameters: {
    sizeBuckets: { xs: number; s: number; m: number; l: number; xl: number };
    coreMultiplier: number;
    featureMultiplier: number;
  };
}

// ── Team Acceleration (Sprint 3C) ────────────────────────────────

export interface ReviewContribution {
  prNumber: number;
  prTitle: string;
  prUrl: string;
  reviewerLogin: string;
  submittedAt: string;
  isFirstReviewOnPr: boolean;
  responseTimeHours?: number;
  depthScore: number;
  basePoints: number;
  finalPoints: number;
}

export interface TeamAccelerationEngineerBreakdown {
  engineerLogin: string;
  reviewCount: number;
  firstReviewCount: number;
  medianResponseHours?: number;
  rawPoints: number;
  normalizedScore: number;
  contributions: ReviewContribution[];
}

export interface TeamAccelerationImpactResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  pillar: "teamAcceleration";
  engineerScores: TeamAccelerationEngineerBreakdown[];
  normalization: {
    minRaw: number;
    maxRaw: number;
    method: "minMaxTo100";
  };
  parameters: {
    reviewBasePoints: number;
    firstReviewBonus: number;
    depthWeight: number;
    responsivenessWeight: number;
    shortReviewLength: number;
    longReviewLength: number;
    fastResponseHours: number;
    mediumResponseHours: number;
  };
}

// ── Ownership & Depth (Sprint 3D) ────────────────────────────────

export interface OwnershipAttribution {
  engineerLogin: string;
  ownedPrefix: string;
  totalPrCount: number;
  ownedAreaPrCount: number;
  focusRatio: number;
  activeWeeks: number;
  reviewsInOwnedArea: number;
  components: {
    focusPoints: number;
    consistencyPoints: number;
    reviewInAreaPoints: number;
  };
  rawPoints: number;
}

export interface OwnershipEngineerBreakdown {
  engineerLogin: string;
  ownedPrefix: string;
  totalPrCount: number;
  ownedAreaPrCount: number;
  focusRatio: number;
  activeWeeks: number;
  reviewsInOwnedArea: number;
  rawPoints: number;
  normalizedScore: number;
  attribution: OwnershipAttribution;
}

export interface OwnershipImpactResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  pillar: "ownership";
  engineerScores: OwnershipEngineerBreakdown[];
  normalization: {
    minRaw: number;
    maxRaw: number;
    method: "minMaxTo100";
  };
  parameters: {
    minPrsForOwnership: number;
    focusWeight: number;
    consistencyWeight: number;
    reviewInAreaWeight: number;
    maxActiveWeeks: number;
  };
}

// ── Execution Quality (Sprint 3E) ────────────────────────────────

export interface ExecutionQualityPenalties {
  followUpFixCount: number;
  revertCount: number;
  churnPrCount: number;
}

export interface ExecutionQualityEngineerBreakdown {
  engineerLogin: string;
  startingScore: number;
  penalties: {
    followUpFixPenalty: number;
    revertPenalty: number;
    churnPenalty: number;
    totalPenalty: number;
  };
  evidence: ExecutionQualityPenalties;
  finalRawScore: number;
  normalizedScore: number;
}

export interface ExecutionQualityImpactResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  pillar: "executionQuality";
  engineerScores: ExecutionQualityEngineerBreakdown[];
  normalization: {
    minRaw: number;
    maxRaw: number;
    method: "minMaxTo100";
  };
  parameters: {
    startingScore: number;
    followUpFixWindowDays: number;
    revertWindowDays: number;
    followUpFixPenaltyPoints: number;
    revertPenaltyPoints: number;
    churnPenaltyPoints: number;
    churnThresholdChangesRequested: number;
    maxTotalPenalty: number;
    fixKeywords: string[];
    revertKeywords: string[];
  };
}

// ── Reliability & Crisis Response (Sprint 3B) ──────────────────
export interface ReliabilityPrAttribution {
  prNumber: number;
  prTitle: string;
  prUrl: string;
  mergedAt: string;
  authorLogin: string;
  triggers: {
    labelBugLike: boolean;
    titleFixLike: boolean;
    titleRevertLike: boolean;
    issueRefCount: number;
    severityLabel?: string;
  };
  basePoints: number;
  severityMultiplier: number;
  coreTouched: boolean;
  coreMultiplier: number;
  finalPrPoints: number;
}

export interface ReliabilityEngineerBreakdown {
  engineerLogin: string;
  prCount: number;
  rawPoints: number;
  normalizedScore: number;
  attributions: ReliabilityPrAttribution[];
}

export interface ReliabilityImpactResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  pillar: "reliability";
  engineerScores: ReliabilityEngineerBreakdown[];
  normalization: {
    minRaw: number;
    maxRaw: number;
    method: "minMaxTo100";
  };
  parameters: {
    labelTriggerPoints: number;
    titleFixTriggerPoints: number;
    titleRevertTriggerPoints: number;
    issueReferenceBonus: number;
    coreMultiplier: number;
    severityMultipliers: Record<string, number>;
    fixKeywords: string[];
    revertKeywords: string[];
  };
}

// ── Final Aggregation & Ranking (Sprint 4) ──────────────────────

export type PillarKey =
  | "delivery"
  | "reliability"
  | "teamAcceleration"
  | "ownership"
  | "executionQuality";

export interface PillarScoreSummary {
  pillar: PillarKey;
  normalizedScore: number;
  weight: number;
  weightedContribution: number;
}

export interface ImpactEngineerResult {
  engineerLogin: string;
  finalScore: number;
  rank: number;
  pillars: PillarScoreSummary[];
  notes: {
    topPillars: PillarKey[];
    explanation: string[];
  };
}

export interface ImpactRankingResult {
  repo: RepoRef;
  windowStart: string;
  windowEnd: string;
  weights: Record<PillarKey, number>;
  engineers: ImpactEngineerResult[];
  top5: ImpactEngineerResult[];
  transparency?: ImpactTransparencyBundle;
}

// ── Transparency & Validation (Sprint 6) ────────────────────────

export interface ValidationWarning {
  code: string;
  message: string;
  severity: "info" | "warn";
}

export interface EngineerWhySummary {
  engineerLogin: string;
  reasons: {
    delivery?: string[];
    reliability?: string[];
    teamAcceleration?: string[];
    ownership?: string[];
    executionQuality?: string[];
  };
}

export interface ImpactTransparencyBundle {
  parameters: {
    timeWindowDays: number;
    coreAreaTopPercent: number;
    pillarWeights: Record<PillarKey, number>;
    delivery: DeliveryImpactResult["parameters"];
    reliability: ReliabilityImpactResult["parameters"];
    teamAcceleration: TeamAccelerationImpactResult["parameters"];
    ownership: OwnershipImpactResult["parameters"];
    executionQuality: ExecutionQualityImpactResult["parameters"];
  };
  validations: ValidationWarning[];
  whyByEngineer: EngineerWhySummary[];
}
