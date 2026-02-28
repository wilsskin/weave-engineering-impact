/**
 * Server-only API route that returns NormalizedImpactInputs.
 * GITHUB_TOKEN is never exposed to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchImpactInputs } from "@/lib/github/fetch";

export const dynamic = "force-dynamic";

const VALID_SLUG = /^[a-zA-Z0-9_.-]+$/;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const refresh = params.get("refresh") === "true";
    const ownerParam = params.get("owner");
    const repoParam = params.get("repo");

    const repo =
      ownerParam && repoParam && VALID_SLUG.test(ownerParam) && VALID_SLUG.test(repoParam)
        ? { owner: ownerParam, repo: repoParam }
        : undefined;

    const result = await fetchImpactInputs({ repo, refresh });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/impact-inputs]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
