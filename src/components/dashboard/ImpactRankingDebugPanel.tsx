"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PillarSummaryDTO {
  pillar: string;
  normalizedScore: number;
  weight: number;
  weightedContribution: number;
}

interface EngineerResultDTO {
  engineerLogin: string;
  finalScore: number;
  rank: number;
  pillars: PillarSummaryDTO[];
  notes: {
    topPillars: string[];
    explanation: string[];
  };
}

interface ImpactRankingResponse {
  meta: { cachedAt: string };
  inputsRef: { repo: { owner: string; repo: string }; windowStart: string; windowEnd: string };
  impact: {
    weights: Record<string, number>;
    engineers: EngineerResultDTO[];
    top5: EngineerResultDTO[];
  };
}

const PILLAR_LABELS: Record<string, string> = {
  delivery: "Delivery",
  reliability: "Reliability",
  teamAcceleration: "Team Accel",
  ownership: "Ownership",
  executionQuality: "Exec Quality",
};

export function ImpactRankingDebugPanel() {
  const [result, setResult] = useState<ImpactRankingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function computeRanking() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/impact-ranking");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          Final Impact Ranking
        </CardTitle>
        <CardDescription>
          Sprint 4 — weighted aggregation of all five pillars
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={computeRanking} disabled={loading}>
          {loading ? "Computing..." : "Compute Final Impact Ranking"}
        </Button>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Cached inputs at{" "}
              {new Date(result.meta.cachedAt).toLocaleString()} &middot;{" "}
              {result.impact.engineers.length} engineers scored
            </p>

            {/* Top 5 table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-1.5 pr-3 font-medium">#</th>
                    <th className="pb-1.5 pr-3 font-medium">Engineer</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">
                      Score
                    </th>
                    <th className="pb-1.5 font-medium">Top Pillars</th>
                  </tr>
                </thead>
                <tbody>
                  {result.impact.top5.map((eng) => (
                    <tr
                      key={eng.engineerLogin}
                      className="border-b last:border-0"
                    >
                      <td className="py-1.5 pr-3 tabular-nums font-medium">
                        {eng.rank}
                      </td>
                      <td className="py-1.5 pr-3 font-mono">
                        {eng.engineerLogin}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums font-semibold">
                        {eng.finalScore.toFixed(2)}
                      </td>
                      <td className="py-1.5">
                        <div className="flex gap-1">
                          {eng.notes.topPillars.map((p) => (
                            <Badge
                              key={p}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {PILLAR_LABELS[p] ?? p}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expandable details for each top-5 engineer */}
            {result.impact.top5.map((eng) => (
              <details
                key={`${eng.engineerLogin}-detail`}
                className="rounded border p-2"
              >
                <summary className="cursor-pointer text-xs font-medium">
                  #{eng.rank} {eng.engineerLogin} — score breakdown
                </summary>
                <ul className="mt-2 space-y-0.5 font-mono text-xs text-muted-foreground">
                  {eng.notes.explanation.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                  <li className="mt-1 font-semibold text-foreground">
                    Final: {eng.finalScore.toFixed(2)}
                  </li>
                </ul>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
