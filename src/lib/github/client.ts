/**
 * Thin wrapper around fetch for GitHub REST API v3.
 * Handles authentication, JSON parsing, pagination via Link header,
 * and rate-limit detection. All GitHub HTTP traffic goes through here.
 */

import { getGithubToken } from "@/lib/config/env";

const GITHUB_BASE = "https://api.github.com";
const DEFAULT_MAX_PAGES = 20;

export type GithubRequestOptions = {
  signal?: AbortSignal;
  maxPages?: number;
};

class GithubRateLimitError extends Error {
  resetAt: string | null;
  constructor(resetAt: string | null) {
    const when = resetAt ? ` Resets at ${resetAt}.` : "";
    super(`GitHub API rate limit exceeded.${when} Use cached data or wait.`);
    this.name = "GithubRateLimitError";
    this.resetAt = resetAt;
  }
}

class GithubPaginationLimitError extends Error {
  constructor(path: string, maxPages: number) {
    super(
      `Pagination safety stop: fetched ${maxPages} pages for ${path}. ` +
        "Increase maxPages if this is expected, or narrow the query."
    );
    this.name = "GithubPaginationLimitError";
  }
}

export { GithubRateLimitError, GithubPaginationLimitError };

function buildHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getGithubToken()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function checkRateLimit(res: Response): void {
  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (res.status === 403 && remaining === "0") {
    const resetEpoch = res.headers.get("X-RateLimit-Reset");
    const resetAt = resetEpoch
      ? new Date(Number(resetEpoch) * 1000).toISOString()
      : null;
    throw new GithubRateLimitError(resetAt);
  }
}

/**
 * Parses the RFC 5988 Link header to extract the "next" URL.
 * Returns null when there is no next page.
 */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

/**
 * Single authenticated GET against the GitHub API.
 * `path` can be a relative path (e.g. "/repos/PostHog/posthog/pulls")
 * or a full URL (used internally for pagination next links).
 */
export async function githubGet<T>(
  path: string,
  options?: GithubRequestOptions
): Promise<{ data: T; headers: Headers }> {
  const url = path.startsWith("http") ? path : `${GITHUB_BASE}${path}`;
  const res = await fetch(url, {
    headers: buildHeaders(),
    signal: options?.signal,
  });

  checkRateLimit(res);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${res.status} on ${url}: ${body}`);
  }

  const data = (await res.json()) as T;
  return { data, headers: res.headers };
}

/**
 * Fetches all pages of a paginated GitHub list endpoint.
 * Follows Link: <…>; rel="next" until exhausted or maxPages reached.
 * Throws on safety-stop to guarantee no silent truncation.
 */
export async function githubGetAllPages<T>(
  path: string,
  options?: GithubRequestOptions
): Promise<T[]> {
  const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
  const allItems: T[] = [];
  let nextUrl: string | null = path.startsWith("http")
    ? path
    : `${GITHUB_BASE}${path}`;
  let page = 0;

  while (nextUrl) {
    if (page >= maxPages) {
      throw new GithubPaginationLimitError(path, maxPages);
    }
    const { data, headers } = await githubGet<T[]>(nextUrl, options);
    allItems.push(...data);
    nextUrl = parseNextLink(headers.get("Link"));
    page++;
  }

  return allItems;
}
