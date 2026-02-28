/**
 * Core Area identification engine.
 *
 * Approximates architectural importance by analysing directory prefixes
 * from PR file paths. Each prefix is scored on three normalised signals:
 *   prFrequency      — how many PRs touched this prefix (activity volume)
 *   distinctAuthors   — how many different engineers contributed (shared surface)
 *   bugShare          — fraction of PRs that carry a bug-type label (reliability criticality)
 *
 * Top 20 % of prefixes by coreScore become "core areas" and later receive
 * multipliers in Delivery and Reliability pillars.
 */

import {
  CORE_AREA_TOP_PERCENT,
  CORE_SCORE_WEIGHTS,
} from "@/lib/config/appConfig";
import { labelCategory } from "@/lib/utils/labelMap";
import type {
  NormalizedImpactInputs,
  PrefixStats,
  CoreAreaResult,
} from "@/lib/types";

// ── Public API ─────────────────────────────────────────────────

export type CoreAreaEngineParams = {
  inputs: NormalizedImpactInputs;
  /** Override the top-percent threshold (0–100). Defaults to appConfig value. */
  topPercent?: number;
  /** Override the default bug-label predicate for testing. */
  bugLabelPredicate?: (labels: string[]) => boolean;
};

/**
 * Computes prefix-level metrics and selects core areas.
 * Pure function — deterministic for the same inputs.
 */
export function computeCoreAreas(params: CoreAreaEngineParams): CoreAreaResult {
  const { inputs, topPercent = CORE_AREA_TOP_PERCENT } = params;
  const isBugPR = params.bugLabelPredicate ?? defaultBugPredicate;

  // A) Build prefix → { prNumbers, authors, bugPrNumbers }
  const prefixMap = new Map<
    string,
    { prNumbers: Set<number>; authors: Set<string>; bugPrNumbers: Set<number> }
  >();

  for (const pr of inputs.pullRequests) {
    if (!pr.files || pr.files.length === 0) continue;

    const isBug = isBugPR(pr.labels);
    const seenPrefixes = new Set<string>();

    for (const file of pr.files) {
      const prefix = file.prefix;
      if (seenPrefixes.has(prefix)) continue;
      seenPrefixes.add(prefix);

      let entry = prefixMap.get(prefix);
      if (!entry) {
        entry = {
          prNumbers: new Set(),
          authors: new Set(),
          bugPrNumbers: new Set(),
        };
        prefixMap.set(prefix, entry);
      }

      entry.prNumbers.add(pr.number);
      entry.authors.add(pr.author.login);
      if (isBug) entry.bugPrNumbers.add(pr.number);
    }
  }

  // B) Compute raw per-prefix metrics
  const rawStats: Omit<PrefixStats, "coreScore">[] = [];

  for (const [prefix, entry] of prefixMap) {
    const prCount = entry.prNumbers.size;
    const distinctAuthors = entry.authors.size;
    const bugPrCount = entry.bugPrNumbers.size;
    const bugShare = prCount > 0 ? bugPrCount / prCount : 0;
    rawStats.push({ prefix, prCount, distinctAuthors, bugPrCount, bugShare });
  }

  // C) Normalise components and compute coreScore
  const maxPrCount = Math.max(0, ...rawStats.map((s) => s.prCount));
  const maxAuthors = Math.max(0, ...rawStats.map((s) => s.distinctAuthors));

  const { prFrequency: wPR, distinctContributors: wAuth, bugLabeledPrShare: wBug } =
    CORE_SCORE_WEIGHTS;

  const stats: PrefixStats[] = rawStats.map((s) => {
    const prCountNorm = maxPrCount > 0 ? s.prCount / maxPrCount : 0;
    const authorsNorm = maxAuthors > 0 ? s.distinctAuthors / maxAuthors : 0;
    const coreScore =
      wPR * prCountNorm + wAuth * authorsNorm + wBug * s.bugShare;
    return { ...s, coreScore };
  });

  // D) Rank descending, deterministic tie-break by prefix name
  stats.sort((a, b) => b.coreScore - a.coreScore || a.prefix.localeCompare(b.prefix));

  // E) Select top N
  const n = Math.max(1, Math.ceil(stats.length * (topPercent / 100)));
  const corePrefixes = stats.slice(0, n).map((s) => s.prefix);

  return {
    repo: inputs.repo,
    windowStart: inputs.windowStart,
    windowEnd: inputs.windowEnd,
    topPercent,
    corePrefixes,
    stats,
  };
}

/** Returns true if `prefix` is in the core set. */
export function isCorePrefix(prefix: string, corePrefixes: string[]): boolean {
  return corePrefixes.includes(prefix);
}

// ── Internals ──────────────────────────────────────────────────

/**
 * Default bug-label predicate: a PR is "bug-type" if any of its
 * normalised labels categorise as bug, regression, or hotfix.
 */
function defaultBugPredicate(labels: string[]): boolean {
  return labels.some((l) => {
    const cat = labelCategory(l);
    return cat === "bug" || cat === "regression" || cat === "hotfix";
  });
}
