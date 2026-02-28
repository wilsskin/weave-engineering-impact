import { NextRequest, NextResponse } from "next/server";
import { fetchImpactInputs } from "@/lib/github/fetch";
import { computeCoreAreas } from "@/lib/coreAreas/coreAreaEngine";
import { scoreReliabilityImpact } from "@/lib/scoring";

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

    const topPercentRaw = params.get("topPercent");
    let topPercent: number | undefined;
    if (topPercentRaw) {
      const parsed = Number(topPercentRaw);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
        topPercent = parsed;
      }
    }

    const { meta, value: inputs } = await fetchImpactInputs({ repo, refresh });
    const coreAreas = computeCoreAreas({ inputs, topPercent });
    const reliability = scoreReliabilityImpact({ inputs, core: coreAreas });

    return NextResponse.json({
      meta: { cachedAt: meta.cachedAt },
      inputsRef: {
        repo: inputs.repo,
        windowStart: inputs.windowStart,
        windowEnd: inputs.windowEnd,
      },
      coreRef: {
        topPercent: coreAreas.topPercent,
        corePrefixesCount: coreAreas.corePrefixes.length,
      },
      reliability,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/scores/reliability]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
