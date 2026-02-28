import { NextRequest, NextResponse } from "next/server";
import { fetchImpactInputs } from "@/lib/github/fetch";
import { computeCoreAreas } from "@/lib/coreAreas/coreAreaEngine";
import {
  scoreDeliveryImpact,
  scoreReliabilityImpact,
  scoreTeamAccelerationImpact,
  scoreOwnershipImpact,
  scoreExecutionQualityImpact,
  aggregateImpactScores,
} from "@/lib/scoring";
import { validateImpactPipeline } from "@/lib/utils/validate";
import { buildWhySummaries } from "@/lib/utils/why";
import {
  TIME_WINDOW_DAYS,
  CORE_AREA_TOP_PERCENT,
} from "@/lib/config/appConfig";
import { GithubRateLimitError, GithubBadCredentialsError } from "@/lib/github/client";

export const dynamic = "force-dynamic";

const VALID_SLUG = /^[a-zA-Z0-9_.-]+$/;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const refresh = params.get("refresh") === "true";
    const ownerParam = params.get("owner");
    const repoParam = params.get("repo");

    const repo =
      ownerParam &&
      repoParam &&
      VALID_SLUG.test(ownerParam) &&
      VALID_SLUG.test(repoParam)
        ? { owner: ownerParam, repo: repoParam }
        : undefined;

    let topPercent: number | undefined;
    const topPercentRaw = params.get("topPercent");
    if (topPercentRaw) {
      const parsed = Number(topPercentRaw);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 100) {
        topPercent = parsed;
      }
    }

    const { meta, value: inputs } = await fetchImpactInputs({
      repo,
      refresh,
    });

    const core = computeCoreAreas({ inputs, topPercent });

    const delivery = scoreDeliveryImpact({ inputs, core });
    const reliability = scoreReliabilityImpact({ inputs, core });
    const teamAcceleration = scoreTeamAccelerationImpact({ inputs });
    const ownership = scoreOwnershipImpact({ inputs });
    const executionQuality = scoreExecutionQualityImpact({ inputs });

    const impact = aggregateImpactScores({
      delivery,
      reliability,
      teamAcceleration,
      ownership,
      executionQuality,
    });

    const validations = validateImpactPipeline({
      inputs,
      core,
      delivery,
      reliability,
      teamAcceleration,
      ownership,
      executionQuality,
      impact,
    });

    const top5Logins = impact.top5.map((e) => e.engineerLogin);
    const whyByEngineer = buildWhySummaries({
      top5Logins,
      delivery,
      reliability,
      teamAcceleration,
      ownership,
      executionQuality,
    });

    impact.transparency = {
      parameters: {
        timeWindowDays: TIME_WINDOW_DAYS,
        coreAreaTopPercent: topPercent ?? CORE_AREA_TOP_PERCENT,
        pillarWeights: { ...impact.weights },
        delivery: delivery.parameters,
        reliability: reliability.parameters,
        teamAcceleration: teamAcceleration.parameters,
        ownership: ownership.parameters,
        executionQuality: executionQuality.parameters,
      },
      validations,
      whyByEngineer,
    };

    return NextResponse.json({
      meta: {
        cachedAt: meta.cachedAt,
        ...(meta.isStale && { isStale: true }),
        ...(meta.staleReason && { staleReason: meta.staleReason }),
        ...(meta.rateLimitResetAt && {
          rateLimitResetAt: meta.rateLimitResetAt,
        }),
        ...(meta.enrichmentProgress && {
          enrichmentProgress: meta.enrichmentProgress,
        }),
      },
      inputsRef: {
        repo: inputs.repo,
        windowStart: inputs.windowStart,
        windowEnd: inputs.windowEnd,
      },
      impact,
    });
  } catch (err) {
    if (err instanceof GithubBadCredentialsError) {
      console.error("[api/impact-ranking]", err.message);
      return NextResponse.json(
        {
          error: err.message,
          errorType: "badCredentials",
          suggestion:
            "Your GITHUB_TOKEN is invalid or revoked. Generate a new one at https://github.com/settings/tokens and update .env.local",
        },
        { status: 401 }
      );
    }
    if (err instanceof GithubRateLimitError) {
      return NextResponse.json(
        {
          error: err.message,
          errorType: "rateLimit",
          rateLimitResetAt: err.resetAt,
          suggestion:
            "No cached data available. Wait for rate limit to reset or check your GITHUB_TOKEN.",
        },
        { status: 429 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/impact-ranking]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
