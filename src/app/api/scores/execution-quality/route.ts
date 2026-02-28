import { NextRequest, NextResponse } from "next/server";
import { fetchImpactInputs } from "@/lib/github/fetch";
import { scoreExecutionQualityImpact } from "@/lib/scoring";

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

    const { meta, value: inputs } = await fetchImpactInputs({ repo, refresh });
    const executionQuality = scoreExecutionQualityImpact({ inputs });

    return NextResponse.json({
      meta: { cachedAt: meta.cachedAt },
      inputsRef: {
        repo: inputs.repo,
        windowStart: inputs.windowStart,
        windowEnd: inputs.windowEnd,
      },
      executionQuality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/scores/execution-quality]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
