import { NextRequest, NextResponse } from "next/server";
import { fetchImpactInputs } from "@/lib/github/fetch";

export const dynamic = "force-dynamic";

/**
 * Cron endpoint to keep the cache warm.
 * Protected by CRON_SECRET — Vercel Cron passes this automatically
 * via the Authorization header when configured.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { meta } = await fetchImpactInputs({ refresh: true });
    return NextResponse.json({
      ok: true,
      cachedAt: meta.cachedAt,
      isStale: meta.isStale ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[cron/refresh]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
