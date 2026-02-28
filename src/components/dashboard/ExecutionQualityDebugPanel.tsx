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

interface ExecutionQualityEngineerDTO {
  engineerLogin: string;
  evidence: {
    followUpFixCount: number;
    revertCount: number;
    churnPrCount: number;
  };
  finalRawScore: number;
  normalizedScore: number;
}

interface ExecutionQualityResponse {
  meta: { cachedAt: string };
  executionQuality: {
    engineerScores: ExecutionQualityEngineerDTO[];
  };
}

const MAX_VISIBLE_ROWS = 10;

export function ExecutionQualityDebugPanel() {
  const [result, setResult] = useState<ExecutionQualityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function computeExecutionQuality() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scores/execution-quality");
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
        <CardTitle className="text-lg">Execution Quality Debug Panel</CardTitle>
        <CardDescription>
          Sprint 3E verification — clean shipping with minimal rework
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={computeExecutionQuality} disabled={loading}>
          {loading ? "Computing..." : "Compute Execution Quality"}
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
                    <th className="pb-1.5 pr-3 text-right font-medium">Fix-ups</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Reverts</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Churn</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Raw</th>
                    <th className="pb-1.5 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {result.executionQuality.engineerScores
                    .slice(0, MAX_VISIBLE_ROWS)
                    .map((engineer) => (
                      <tr key={engineer.engineerLogin} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-mono">{engineer.engineerLogin}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.evidence.followUpFixCount}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.evidence.revertCount}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.evidence.churnPrCount}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.finalRawScore.toFixed(0)}
                        </td>
                        <td className="py-1 text-right tabular-nums">
                          {engineer.normalizedScore.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
