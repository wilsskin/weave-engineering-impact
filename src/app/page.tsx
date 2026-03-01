"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TopFiveTable } from "@/components/dashboard/TopFiveTable";
import { EngineerDetail } from "@/components/dashboard/EngineerDetail";
import { HowItWorks } from "@/components/dashboard/HowItWorks";
import { DataStatus, isRefreshBlocked } from "@/components/dashboard/DataStatus";
import type { ImpactEngineerResult, ImpactRankingResult } from "@/lib/types";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface EnrichmentProgress {
  enrichedPrs: number;
  totalPrs: number;
  isComplete: boolean;
}

interface ResponseMeta {
  cachedAt: string;
  isStale?: boolean;
  staleReason?: string;
  rateLimitResetAt?: string;
  enrichmentProgress?: EnrichmentProgress;
}

interface RankingResponse {
  meta: ResponseMeta;
  inputsRef: {
    repo: { owner: string; repo: string };
    windowStart: string;
    windowEnd: string;
  };
  impact: ImpactRankingResult;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLogin, setSelectedLogin] = useState<string>("");

  const [errorType, setErrorType] = useState<string | null>(null);

  const fetchRanking = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    setErrorType(null);
    try {
      const url = refresh
        ? "/api/impact-ranking?refresh=true"
        : "/api/impact-ranking";
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorType(body.errorType ?? null);
        throw new Error(
          body.error ?? `HTTP ${res.status}`
        );
      }
      const json: RankingResponse = await res.json();
      setData(json);
      if (json.impact.top5.length > 0) {
        setSelectedLogin((prev) => {
          const stillExists = json.impact.top5.some(
            (e) => e.engineerLogin === prev
          );
          return stillExists ? prev : json.impact.top5[0].engineerLogin;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const selectedEngineer: ImpactEngineerResult | undefined =
    data?.impact.top5.find((e) => e.engineerLogin === selectedLogin);

  const progress = data?.meta?.enrichmentProgress;
  const isIncomplete = progress && !progress.isComplete;

  const refreshDisabled =
    loading || (data?.meta ? isRefreshBlocked(data.meta) : false);

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="w-full max-w-4xl space-y-5">
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              PostHog Engineering Impact
            </h1>
            <p className="text-sm text-muted-foreground">
              Top 5 most impactful engineers at PostHog in the last 30 days
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRanking(true)}
            disabled={refreshDisabled}
            aria-label="Refresh data from GitHub"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {loading
                ? "Loading..."
                : isIncomplete
                  ? "Load More Data"
                  : "Refresh Data"}
            </span>
          </Button>
        </div>

        {/* ── Error state ─────────────────────────────────── */}
        {error && (
          <Card className="border-destructive/50">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-destructive">
                  {errorType === "badCredentials"
                    ? "Invalid GitHub Token"
                    : errorType === "rateLimit"
                      ? "GitHub API Rate Limit Reached"
                      : "Failed to load impact data"}
                </p>
                <p className="text-muted-foreground">{error}</p>
                {errorType === "badCredentials" ? (
                  <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-0.5">
                    <li>
                      Go to{" "}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        github.com/settings/tokens
                      </a>{" "}
                      and generate a new token (classic, with <code className="font-mono">repo</code> scope)
                    </li>
                    <li>
                      Update <code className="font-mono">GITHUB_TOKEN</code> in{" "}
                      <code className="font-mono">.env.local</code>
                    </li>
                    <li>Restart the dev server, then click Refresh Data</li>
                  </ol>
                ) : (
                  <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                    <li>
                      Confirm <code className="font-mono">GITHUB_TOKEN</code> is
                      set in <code className="font-mono">.env.local</code>
                    </li>
                    <li>
                      If rate-limited, wait for the reset time or use a token with
                      higher limits
                    </li>
                    <li>Click Refresh Data to retry</li>
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Loading skeleton ────────────────────────────── */}
        {loading && !data && (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 size-5 animate-spin" />
              Fetching impact data&hellip;
            </CardContent>
          </Card>
        )}

        {/* ── Dashboard body ──────────────────────────────── */}
        {data && (
          <>
            {/* Data status bar */}
            <DataStatus meta={data.meta} />

            {/* Table (left) + Engineer detail (right) — single card */}
            <Card>
              <div className="grid sm:grid-cols-[minmax(0,1fr)_1.4fr]">
                {/* Left: Top 5 table */}
                <div className="px-6 pb-6 border-b border-border/60 sm:border-b-0 sm:border-r sm:border-border/60 sm:pr-6">
                  <h3 className="font-semibold text-base pb-2">Top 5 Engineers</h3>
                  <TopFiveTable
                    engineers={data.impact.top5}
                    selectedLogin={selectedLogin}
                    onSelect={setSelectedLogin}
                  />
                </div>

                {/* Right: Selected engineer detail + transparency */}
                {selectedEngineer && (
                  <div className="space-y-5 px-6 py-6">
                    <EngineerDetail
                      engineer={selectedEngineer}
                      whySummary={
                        data.impact.transparency?.whyByEngineer.find(
                          (w) => w.engineerLogin === selectedLogin
                        ) ?? null
                      }
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* How it works */}
            <HowItWorks />

            {/* Footer meta */}
            <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                <span className="font-medium">Repo</span>{" "}
                <Badge variant="outline" className="text-[10px] font-mono">
                  {data.inputsRef.repo.owner}/{data.inputsRef.repo.repo}
                </Badge>
              </span>
              <span>
                <span className="font-medium">Window</span>{" "}
                {formatDate(data.inputsRef.windowStart)} &mdash;{" "}
                {formatDate(data.inputsRef.windowEnd)}
              </span>
              <span>
                {data.impact.engineers.length} engineers scored
              </span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
