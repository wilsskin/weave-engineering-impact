/**
 * GitHub data fetch orchestrator for Sprint 1.
 * Pulls merged PRs (with detail, files, reviews), and issues for the
 * configured time window, normalizes into NormalizedImpactInputs,
 * excludes bots, and caches the final result to disk.
 */

import { DEFAULT_REPO, CACHE_VERSION } from "@/lib/config/appConfig";
import { getWindow } from "@/lib/utils/timeWindow";
import { normalizeActor } from "@/lib/utils/identity";
import { normalizeLabel } from "@/lib/utils/labelMap";
import { filePathToLite } from "@/lib/utils/paths";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { getOrSetCache, type CacheMeta } from "@/lib/cache/cache";
import { githubGet, githubGetAllPages } from "./client";
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

  return getOrSetCache(cacheKey, refresh, () =>
    loadAllData(repo, window.start, window.end)
  );
}

// ── Internal loader ────────────────────────────────────────────

const PR_CONCURRENCY = 5;

/** Buffer days before windowStart where we still fetch closed PRs,
 *  because a PR can be updated after it's merged. */
const UPDATED_BUFFER_DAYS = 7;

async function loadAllData(
  repo: RepoRef,
  windowStart: string,
  windowEnd: string
): Promise<NormalizedImpactInputs> {
  const { owner, repo: repoName } = repo;

  // 1. Fetch merged PRs in the window
  const rawPRs = await fetchMergedPRs(owner, repoName, windowStart, windowEnd);
  console.log(`[fetch] ${rawPRs.length} merged PRs found in window`);

  // 2. Enrich each PR with detail, files, and reviews (concurrency-limited)
  const enriched = await mapWithConcurrency(
    rawPRs,
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

  // 3. Normalize PRs
  const pullRequests: PullRequestLite[] = [];
  const allReviews: ReviewLite[] = [];

  for (const { pr, detail, files, reviews } of enriched) {
    const author = normalizeActor(pr.user);
    if (author.isBot) continue;

    const labels = (pr.labels as GHLabel[]).map((l) => normalizeLabel(l.name));
    const fileList = files.map((f: GHFile) => filePathToLite(f.filename));

    pullRequests.push({
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

      allReviews.push({
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

  // 4. Fetch issues
  const issues = await fetchIssues(owner, repoName, windowStart);

  console.log(
    `[fetch] Normalized: ${pullRequests.length} PRs, ` +
      `${allReviews.length} reviews, ${issues.length} issues`
  );

  const engineers = new Set(pullRequests.map((pr) => pr.author.login));
  const reviewers = new Set(allReviews.map((r) => r.reviewer.login));
  for (const r of reviewers) engineers.add(r);
  console.log(`[fetch] ${engineers.size} distinct engineers`);

  return {
    repo,
    windowStart,
    windowEnd,
    pullRequests,
    reviews: allReviews,
    issues,
  };
}

// ── GitHub REST fetchers ───────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type GHLabel = { name: string };
type GHFile = { filename: string };

/**
 * Fetches closed PRs sorted by updated desc, filtering to those
 * merged within the window. Stops paging when updated_at is well
 * before the window start (with a buffer).
 */
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
  } catch {
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
  } catch {
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
  } catch {
    return [];
  }
}

/**
 * Fetches issues updated since windowStart.
 * Filters out pull requests (GitHub includes PRs in the issues endpoint)
 * and excludes bot authors.
 */
async function fetchIssues(
  owner: string,
  repo: string,
  windowStart: string
): Promise<IssueLite[]> {
  const raw = await githubGetAllPages<any>(
    `/repos/${owner}/${repo}/issues?state=all&since=${windowStart}&per_page=100`
  );

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
