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

interface DeliveryAttributionDTO {
  prNumber: number;
  sizeBucket: "xs" | "s" | "m" | "l" | "xl";
  sizePoints: number;
  isCoreTouched: boolean;
  coreMultiplier: number;
  hasFeatureLabel: boolean;
  featureMultiplier: number;
  finalPrPoints: number;
}

interface DeliveryEngineerDTO {
  engineerLogin: string;
  prCount: number;
  rawPoints: number;
  normalizedScore: number;
  attributions: DeliveryAttributionDTO[];
}

interface DeliveryResponse {
  meta: { cachedAt: string };
  delivery: {
    engineerScores: DeliveryEngineerDTO[];
  };
}

const MAX_VISIBLE_ROWS = 10;

export function DeliveryImpactDebugPanel() {
  const [result, setResult] = useState<DeliveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function computeDelivery() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scores/delivery");
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
        <CardTitle className="text-lg">Delivery Impact Debug Panel</CardTitle>
        <CardDescription>
          Sprint 3A verification — merged PR delivery scoring
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={computeDelivery} disabled={loading}>
          {loading ? "Computing..." : "Compute Delivery Impact"}
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
                  {result.delivery.engineerScores
                    .slice(0, MAX_VISIBLE_ROWS)
                    .map((engineer) => (
                      <tr key={engineer.engineerLogin} className="border-b last:border-0">
                        <td className="py-1 pr-3 font-mono">{engineer.engineerLogin}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">{engineer.prCount}</td>
                        <td className="py-1 pr-3 text-right tabular-nums">
                          {engineer.rawPoints.toFixed(2)}
                        </td>
                        <td className="py-1 text-right tabular-nums">
                          {engineer.normalizedScore.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {result.delivery.engineerScores.slice(0, MAX_VISIBLE_ROWS).map((engineer) => (
              <details key={`${engineer.engineerLogin}-details`} className="rounded border p-2">
                <summary className="cursor-pointer text-xs font-medium">
                  Details for {engineer.engineerLogin}
                </summary>
                <ul className="mt-2 space-y-1 text-xs">
                  {engineer.attributions.slice(0, 5).map((attr) => (
                    <li key={`${engineer.engineerLogin}-${attr.prNumber}`}>
                      #{attr.prNumber} [{attr.sizeBucket}] size={attr.sizePoints} x core=
                      {attr.coreMultiplier} x feature={attr.featureMultiplier} =&nbsp;
                      {attr.finalPrPoints.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
