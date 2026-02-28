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

interface ReliabilityAttributionDTO {
  prNumber: number;
  triggers: {
    labelBugLike: boolean;
    titleRevertLike: boolean;
  };
}

interface ReliabilityEngineerDTO {
  engineerLogin: string;
  prCount: number;
  rawPoints: number;
  normalizedScore: number;
  attributions: ReliabilityAttributionDTO[];
}

interface ReliabilityResponse {
  meta: { cachedAt: string };
  reliability: {
    engineerScores: ReliabilityEngineerDTO[];
  };
}

const MAX_VISIBLE_ROWS = 10;

export function ReliabilityImpactDebugPanel() {
  const [result, setResult] = useState<ReliabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function computeReliability() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scores/reliability");
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
        <CardTitle className="text-lg">Reliability Impact Debug Panel</CardTitle>
        <CardDescription>
          Sprint 3B verification — stability and crisis-response scoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={computeReliability} disabled={loading}>
          {loading ? "Computing..." : "Compute Reliability Impact"}
        </Button>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Cached inputs at {new Date(result.meta.cachedAt).toLocaleString()}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-1.5 pr-3 font-medium">Engineer</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">PRs</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Raw</th>
                    <th className="pb-1.5 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {result.reliability.engineerScores
                    .slice(0, MAX_VISIBLE_ROWS)
                    .map((engineer) => {
                      const labelBugCount = engineer.attributions.filter(
                        (attr) => attr.triggers.labelBugLike
                      ).length;
                      const revertCount = engineer.attributions.filter(
                        (attr) => attr.triggers.titleRevertLike
                      ).length;
                      return (
                        <tr key={engineer.engineerLogin} className="border-b last:border-0">
                          <td className="py-1 pr-3 font-mono">{engineer.engineerLogin}</td>
                          <td className="py-1 pr-3 text-right tabular-nums">{engineer.prCount}</td>
                          <td className="py-1 pr-3 text-right tabular-nums">
                            {engineer.rawPoints.toFixed(2)}
                            <span className="ml-2 text-[10px] text-muted-foreground">
                              b:{labelBugCount} r:{revertCount}
                            </span>
                          </td>
                          <td className="py-1 text-right tabular-nums">
                            {engineer.normalizedScore.toFixed(0)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
