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
