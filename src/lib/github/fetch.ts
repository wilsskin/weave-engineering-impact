/**
 * GitHub data fetch orchestrator.
 *
 * Implements a cascading/incremental fetch pattern:
 *   1. Fetch the PR listing (cheap — ~20 API calls)
 *   2. Check cache for already-enriched PRs from previous fetches
 *   3. Enrich only the NEW PRs (capped per rate-limit budget)
 *   4. Merge old + new data and save to cache
 *   5. On next refresh, repeat from step 1 — picks up where it left off
 *
 * After 2–3 refreshes the full dataset is loaded and cached.
 * Subsequent loads serve from cache with zero API calls.
 */

import {
  DEFAULT_REPO,
  CACHE_VERSION,
  REFRESH_COOLDOWN_SECONDS,
  MAX_PR_ENRICHMENT,
  MIN_RATE_LIMIT_BUDGET,
} from "@/lib/config/appConfig";
import { getWindow } from "@/lib/utils/timeWindow";
import { normalizeActor } from "@/lib/utils/identity";
import { normalizeLabel } from "@/lib/utils/labelMap";
import { filePathToLite } from "@/lib/utils/paths";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import {
  readCache,
  readCacheIgnoreTtl,
  writeCache,
  type CacheMeta,
} from "@/lib/cache/cache";
import {
  githubGet,
  githubGetAllPages,
  GithubRateLimitError,
  GithubBadCredentialsError,
  validateToken,
} from "./client";
import type {
  RepoRef,
  NormalizedImpactInputs,
  PullRequestLite,
  ReviewLite,
  IssueLite,
  Actor,
} from "@/lib/types";

// ── Public API ─────────────────────────────────────────────────

export type FetchImpactInputsParams = {
  repo?: RepoRef;
  now?: Date;
  refresh?: boolean;
};

export async function fetchImpactInputs(
  params?: FetchImpactInputsParams
): Promise<{ meta: CacheMeta; value: NormalizedImpactInputs }> {
  const repo = params?.repo ?? DEFAULT_REPO;
  const now = params?.now ?? new Date();
  const refresh = params?.refresh ?? false;
  const window = getWindow(now);

  const cacheKey = [
    "impactInputs",
    repo.owner,
    repo.repo,
    window.start,
    window.end,
    CACHE_VERSION,
  ].join(":");

  // Always read existing cache first (needed for incremental merge)
  const existing = await readCacheIgnoreTtl<NormalizedImpactInputs>(cacheKey);

  // Non-refresh: return fresh cache if available and complete
  if (!refresh) {
    const fresh = await readCache<NormalizedImpactInputs>(cacheKey);
    if (fresh) return fresh;
  }

  // Refresh with cooldown — but skip cooldown if data is incomplete
  const isComplete = existing?.value.fetchProgress?.enrichedPrNumbers.length ===
    existing?.value.fetchProgress?.totalPrsInWindow &&
    existing?.value.fetchProgress?.issuesFetched === true;

  if (refresh && existing && isComplete) {
    const ageSeconds =
      (Date.now() - new Date(existing.meta.cachedAt).getTime()) / 1000;
    if (ageSeconds < REFRESH_COOLDOWN_SECONDS) {
      return {
        meta: {
          ...existing.meta,
          isStale: true,
          staleReason: "cooldown",
        },
        value: existing.value,
      };
    }
  }

  // Attempt fresh / incremental fetch
  try {
    const budget = await validateToken();
    console.log(
      `[fetch] Token OK. Rate limit: ${budget.remaining}/${budget.limit} remaining`
    );

    if (budget.remaining < MIN_RATE_LIMIT_BUDGET) {
      const err = new GithubRateLimitError(null, budget.remaining);
      // If we have partial data, return it with a rate-limit note
      if (existing) {
        return {
          meta: {
            ...existing.meta,
            isStale: true,
            staleReason: "rateLimit",
          },
          value: existing.value,
        };
      }
      throw err;
    }

    const value = await loadAllData(
      repo,
      window.start,
      window.end,
      budget.remaining,
      existing?.value ?? null
    );

    const progress = value.fetchProgress;
    const enrichmentMeta = progress
      ? {
          enrichedPrs: progress.enrichedPrNumbers.length,
          totalPrs: progress.totalPrsInWindow,
          isComplete:
            progress.enrichedPrNumbers.length >= progress.totalPrsInWindow &&
            progress.issuesFetched,
        }
      : undefined;

    const { meta } = await writeCache(cacheKey, value);
    return {
      meta: { ...meta, enrichmentProgress: enrichmentMeta },
      value,
    };
  } catch (err) {
    // Bad credentials — surface clearly
    if (err instanceof GithubBadCredentialsError) {
      console.error("[fetch] Bad credentials:", err.message);
      if (existing) {
        return {
          meta: { ...existing.meta, isStale: true, staleReason: "errorFallback" },
          value: existing.value,
        };
      }
      throw err;
    }

    // Rate-limit fallback
    if (err instanceof GithubRateLimitError) {
      console.warn(
        "[fetch] Rate limited. Attempting stale cache fallback.",
        err.message
      );
      if (existing) {
        return {
          meta: {
            ...existing.meta,
            isStale: true,
            staleReason: "rateLimit",
            rateLimitResetAt: err.resetAt ?? undefined,
          },
          value: existing.value,
        };
      }
      throw err;
    }

    // Generic error fallback
    if (existing) {
      console.warn(
        "[fetch] Fetch failed, serving stale cache:",
        err instanceof Error ? err.message : err
      );
      return {
        meta: { ...existing.meta, isStale: true, staleReason: "errorFallback" },
        value: existing.value,
      };
    }
    throw err;
  }
}

// ── Internal loader ────────────────────────────────────────────

const PR_CONCURRENCY = 5;
const SUB_BATCH_SIZE = 50;

const UPDATED_BUFFER_DAYS = 7;

/* eslint-disable @typescript-eslint/no-explicit-any */
type GHLabel = { name: string };
type GHFile = { filename: string };

async function loadAllData(
  repo: RepoRef,
  windowStart: string,
  windowEnd: string,
  rateLimitRemaining: number,
  existingData: NormalizedImpactInputs | null
): Promise<NormalizedImpactInputs> {
  const { owner, repo: repoName } = repo;

  // ── 1. Fetch the PR listing (cheap, ~20 API calls) ──────────
  const rawPRs = await fetchMergedPRs(owner, repoName, windowStart, windowEnd);
  console.log(`[fetch] ${rawPRs.length} merged PRs found in window`);

  // ── 2. Determine which PRs still need enrichment ─────────────
  const alreadyEnriched = new Set(
    existingData?.fetchProgress?.enrichedPrNumbers ?? []
  );
  const prsNeedingEnrichment = rawPRs.filter(
    (pr) => !alreadyEnriched.has(pr.number)
  );
  console.log(
    `[fetch] ${alreadyEnriched.size} already enriched, ` +
      `${prsNeedingEnrichment.length} remaining`
  );

  // ── 3. Cap batch to rate-limit budget ────────────────────────
  // Each PR ≈ 3 API calls. Reserve 50 for issues + headroom.
  const budgetForEnrichment = Math.floor((rateLimitRemaining - 50) / 3);
  const batchCap = Math.min(
    MAX_PR_ENRICHMENT,
    Math.max(budgetForEnrichment, 0),
    prsNeedingEnrichment.length
  );
  const prsToEnrich = prsNeedingEnrichment.slice(0, batchCap);

  if (prsNeedingEnrichment.length > batchCap) {
    console.log(
      `[fetch] Enriching ${batchCap} of ${prsNeedingEnrichment.length} remaining PRs ` +
        `(budget: ${rateLimitRemaining} API calls left)`
    );
  }

  // ── 4. Enrich in sub-batches with graceful degradation ───────
  const enriched: { pr: any; detail: any; files: GHFile[]; reviews: any[] }[] = [];
  let enrichmentAborted = false;

  for (let i = 0; i < prsToEnrich.length && !enrichmentAborted; i += SUB_BATCH_SIZE) {
    const batch = prsToEnrich.slice(i, i + SUB_BATCH_SIZE);
    try {
      const results = await mapWithConcurrency(
        batch,
        PR_CONCURRENCY,
        async (pr) => {
          const [detail, files, reviews] = await Promise.all([
            fetchPRDetail(owner, repoName, pr.number),
            fetchPRFiles(owner, repoName, pr.number),
            fetchPRReviews(owner, repoName, pr.number),
          ]);
          return { pr, detail, files, reviews };
        }
      );
      enriched.push(...results);
      console.log(
        `[fetch] Enriched batch: ${enriched.length}/${prsToEnrich.length}`
      );
    } catch (err) {
      if (err instanceof GithubRateLimitError || err instanceof GithubBadCredentialsError) {
        console.warn(
          `[fetch] Sub-batch stopped at ${enriched.length}/${prsToEnrich.length}: ` +
            (err instanceof Error ? err.message : String(err))
        );
        enrichmentAborted = true;
      } else {
        throw err;
      }
    }
  }

  // ── 5. Normalize newly enriched PRs ──────────────────────────
  const newPullRequests: PullRequestLite[] = [];
  const newReviews: ReviewLite[] = [];
  const newEnrichedNumbers: number[] = [];

  for (const { pr, detail, files, reviews } of enriched) {
    newEnrichedNumbers.push(pr.number);

    const author = normalizeActor(pr.user);
    if (author.isBot) continue;

    const labels = (pr.labels as GHLabel[]).map((l) => normalizeLabel(l.name));
    const fileList = files.map((f: GHFile) => filePathToLite(f.filename));

    newPullRequests.push({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      author,
      createdAt: pr.created_at,
      mergedAt: pr.merged_at!,
      closedAt: pr.closed_at!,
      url: pr.html_url,
      additions: detail?.additions,
      deletions: detail?.deletions,
      changedFiles: detail?.changed_files,
      labels,
      files: fileList,
    });

    for (const rev of reviews) {
      if (!rev.user) continue;
      const reviewer = normalizeActor(rev.user);
      if (reviewer.isBot) continue;

      newReviews.push({
        id: rev.id,
        prNumber: pr.number,
        reviewer,
        state: rev.state,
        submittedAt: rev.submitted_at ?? "",
        bodyLength: rev.body?.length ?? 0,
        commentCount: undefined,
      });
    }
  }

  // ── 6. Merge with existing cached data ───────────────────────
  const mergedPullRequests = [
    ...(existingData?.pullRequests ?? []),
    ...newPullRequests,
  ];
  const mergedReviews = [
    ...(existingData?.reviews ?? []),
    ...newReviews,
  ];
  const mergedEnrichedNumbers = [
    ...alreadyEnriched,
    ...newEnrichedNumbers,
  ];

  // ── 7. Fetch issues if not already done ──────────────────────
  const issuesAlreadyFetched = existingData?.fetchProgress?.issuesFetched === true;
  let mergedIssues: IssueLite[] = existingData?.issues ?? [];
  let issuesFetched = issuesAlreadyFetched;

  if (!issuesAlreadyFetched && !enrichmentAborted) {
    try {
      mergedIssues = await fetchIssues(owner, repoName, windowStart);
      issuesFetched = true;
    } catch (err) {
      if (err instanceof GithubRateLimitError || err instanceof GithubBadCredentialsError) {
        console.warn("[fetch] Skipping issues fetch — rate limited or auth error");
      } else {
        throw err;
      }
    }
  }

  // ── 8. Build result with progress tracking ───────────────────
  const totalInWindow = rawPRs.length;
  const totalEnriched = mergedEnrichedNumbers.length;

  console.log(
    `[fetch] Result: ${mergedPullRequests.length} PRs, ` +
      `${mergedReviews.length} reviews, ${mergedIssues.length} issues | ` +
      `Progress: ${totalEnriched}/${totalInWindow} enriched` +
      (issuesFetched ? ", issues done" : ", issues pending")
  );

  const engineers = new Set(mergedPullRequests.map((pr) => pr.author.login));
  const reviewers = new Set(mergedReviews.map((r) => r.reviewer.login));
  for (const r of reviewers) engineers.add(r);
  console.log(`[fetch] ${engineers.size} distinct engineers`);

  return {
    repo,
    windowStart,
    windowEnd,
    pullRequests: mergedPullRequests,
    reviews: mergedReviews,
    issues: mergedIssues,
    fetchProgress: {
      totalPrsInWindow: totalInWindow,
      enrichedPrNumbers: mergedEnrichedNumbers,
      issuesFetched,
    },
  };
}

// ── GitHub REST fetchers ───────────────────────────────────────

async function fetchMergedPRs(
  owner: string,
  repo: string,
  windowStart: string,
  windowEnd: string
): Promise<any[]> {
  const startDate = new Date(windowStart);
  const bufferDate = new Date(startDate);
  bufferDate.setDate(bufferDate.getDate() - UPDATED_BUFFER_DAYS);

  const windowEndDate = new Date(windowEnd);
  const merged: any[] = [];
  let page = 1;
  const maxPages = 20;

  while (page <= maxPages) {
    const path =
      `/repos/${owner}/${repo}/pulls?state=closed&sort=updated` +
      `&direction=desc&per_page=100&page=${page}`;
    const { data } = await githubGet<any[]>(path);

    if (data.length === 0) break;

    let pastBuffer = false;
    for (const pr of data) {
      if (!pr.merged_at) continue;
      const mergedAt = new Date(pr.merged_at);
      if (mergedAt >= startDate && mergedAt <= windowEndDate) {
        merged.push(pr);
      }
      const updatedAt = new Date(pr.updated_at);
      if (updatedAt < bufferDate) {
        pastBuffer = true;
      }
    }

    if (pastBuffer) break;
    page++;
  }

  return merged;
}

async function fetchPRDetail(
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ additions: number; deletions: number; changed_files: number } | null> {
  try {
    const { data } = await githubGet<any>(
      `/repos/${owner}/${repo}/pulls/${prNumber}`
    );
    return {
      additions: data.additions ?? 0,
      deletions: data.deletions ?? 0,
      changed_files: data.changed_files ?? 0,
    };
  } catch (err) {
    if (err instanceof GithubRateLimitError || err instanceof GithubBadCredentialsError) throw err;
    return null;
  }
}

async function fetchPRFiles(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GHFile[]> {
  try {
    return await githubGetAllPages<GHFile>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`
    );
  } catch (err) {
    if (err instanceof GithubRateLimitError || err instanceof GithubBadCredentialsError) throw err;
    return [];
  }
}

async function fetchPRReviews(
  owner: string,
  repo: string,
  prNumber: number
): Promise<any[]> {
  try {
    return await githubGetAllPages<any>(
      `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100`
    );
  } catch (err) {
    if (err instanceof GithubRateLimitError || err instanceof GithubBadCredentialsError) throw err;
    return [];
  }
}

const ISSUES_MAX_PAGES = 20;

async function fetchIssues(
  owner: string,
  repo: string,
  windowStart: string
): Promise<IssueLite[]> {
  const basePath = `/repos/${owner}/${repo}/issues?state=all&since=${windowStart}&per_page=100`;
  const raw: any[] = [];

  for (let page = 1; page <= ISSUES_MAX_PAGES; page++) {
    const path = page === 1 ? basePath : `${basePath}&page=${page}`;
    const { data, headers } = await githubGet<any[]>(path);
    if (data.length === 0) break;
    raw.push(...data);
    if (data.length < 100) break;
    const linkHeader = headers.get("Link");
    if (!linkHeader?.includes('rel="next"')) break;
  }

  const issues: IssueLite[] = [];
  for (const item of raw) {
    if (item.pull_request) continue;
    if (!item.user) continue;
    const author: Actor = normalizeActor(item.user);
    if (author.isBot) continue;

    issues.push({
      id: item.id,
      number: item.number,
      title: item.title,
      author,
      createdAt: item.created_at,
      closedAt: item.closed_at ?? undefined,
      labels: (item.labels as GHLabel[]).map((l) => normalizeLabel(l.name)),
      url: item.html_url,
    });
  }

  return issues;
}
