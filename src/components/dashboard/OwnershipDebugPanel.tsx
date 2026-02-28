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

interface OwnershipEngineerDTO {
  engineerLogin: string;
  ownedPrefix: string;
  focusRatio: number;
  activeWeeks: number;
  reviewsInOwnedArea: number;
  rawPoints: number;
  normalizedScore: number;
}

interface OwnershipResponse {
  meta: { cachedAt: string };
  ownership: {
    engineerScores: OwnershipEngineerDTO[];
  };
}

const MAX_VISIBLE_ROWS = 10;

export function OwnershipDebugPanel() {
  const [result, setResult] = useState<OwnershipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function computeOwnership() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scores/ownership");
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
        <CardTitle className="text-lg">Ownership &amp; Depth Debug Panel</CardTitle>
        <CardDescription>
          Sprint 3D verification — subsystem anchoring and sustained ownership
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={computeOwnership} disabled={loading}>
          {loading ? "Computing..." : "Compute Ownership"}
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
                    <th className="pb-1.5 pr-3 font-medium">Owned Prefix</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Focus</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Weeks</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Rev Area</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Raw</th>
                    <th className="pb-1.5 text-right font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ownership.engineerScores
                    .slice(0, MAX_VISIBLE_ROWS)
                    .map((engineer) => (
                      <tr key={engineer.engineerLogin} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-mono">{engineer.engineerLogin}</td>
                        <td className="py-1 pr-3 font-mono text-muted-foreground max-w-[140px] truncate">
                          {engineer.ownedPrefix}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {(engineer.focusRatio * 100).toFixed(0)}%
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.activeWeeks}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.reviewsInOwnedArea}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.rawPoints.toFixed(1)}
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
