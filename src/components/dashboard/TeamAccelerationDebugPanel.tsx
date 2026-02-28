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

interface TeamAccelerationEngineerDTO {
  engineerLogin: string;
  reviewCount: number;
  firstReviewCount: number;
  medianResponseHours?: number;
  rawPoints: number;
  normalizedScore: number;
}

interface TeamAccelerationResponse {
  meta: { cachedAt: string };
  teamAcceleration: {
    engineerScores: TeamAccelerationEngineerDTO[];
  };
}

const MAX_VISIBLE_ROWS = 10;

export function TeamAccelerationDebugPanel() {
  const [result, setResult] = useState<TeamAccelerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function computeTeamAcceleration() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scores/team-acceleration");
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
        <CardTitle className="text-lg">Team Acceleration Debug Panel</CardTitle>
        <CardDescription>
          Sprint 3C verification — review velocity and team multiplier scoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={computeTeamAcceleration} disabled={loading}>
          {loading ? "Computing..." : "Compute Team Acceleration"}
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
                    <th className="pb-1.5 pr-3 text-right font-medium">Reviews</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">1st Rev</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Raw</th>
                    <th className="pb-1.5 pr-3 text-right font-medium">Score</th>
                    <th className="pb-1.5 text-right font-medium">Med Resp (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {result.teamAcceleration.engineerScores
                    .slice(0, MAX_VISIBLE_ROWS)
                    .map((engineer) => (
                      <tr key={engineer.engineerLogin} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-mono">{engineer.engineerLogin}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.reviewCount}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.firstReviewCount}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.rawPoints.toFixed(2)}
                        </td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.normalizedScore.toFixed(0)}
                        </td>
                        <td className="py-1 text-right tabular-nums">
                          {engineer.medianResponseHours != null
                            ? engineer.medianResponseHours.toFixed(1)
                            : "—"}
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
