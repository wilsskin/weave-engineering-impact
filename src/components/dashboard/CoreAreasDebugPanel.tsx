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

interface PrefixStatsDTO {
  prefix: string;
  prCount: number;
  distinctAuthors: number;
  bugPrCount: number;
  bugShare: number;
  coreScore: number;
}

interface CoreAreasResponse {
  meta: { cachedAt: string };
  inputsRef: { repo: { owner: string; repo: string }; windowStart: string; windowEnd: string };
  coreAreas: {
    topPercent: number;
    corePrefixes: string[];
    stats: PrefixStatsDTO[];
  };
}

const MAX_VISIBLE_PREFIXES = 10;
const MAX_VISIBLE_ROWS = 10;

export function CoreAreasDebugPanel() {
  const [result, setResult] = useState<CoreAreasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/core-areas");
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
        <CardTitle className="text-lg">Core Areas Debug Panel</CardTitle>
        <CardDescription>
          Sprint 2 verification — directory prefix heuristic
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={load} disabled={loading}>
          {loading ? "Computing\u2026" : "Compute Core Areas"}
        </Button>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">
                Top {result.coreAreas.topPercent}%
              </Badge>
              <Badge variant="outline">
                {result.coreAreas.corePrefixes.length} core /{" "}
                {result.coreAreas.stats.length} total prefixes
              </Badge>
            </div>

            {/* Core prefix list */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Core Prefixes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.coreAreas.corePrefixes
                  .slice(0, MAX_VISIBLE_PREFIXES)
                  .map((p) => (
                    <Badge key={p} className="font-mono text-xs">
                      {p}
                    </Badge>
                  ))}
                {result.coreAreas.corePrefixes.length > MAX_VISIBLE_PREFIXES && (
                  <Badge variant="outline" className="text-xs">
                    +{result.coreAreas.corePrefixes.length - MAX_VISIBLE_PREFIXES} more
                  </Badge>
                )}
              </div>
            </div>

            {/* Top prefix stats table */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Top {MAX_VISIBLE_ROWS} Prefix Stats (sorted by coreScore)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-1.5 pr-3 font-medium">Prefix</th>
                      <th className="pb-1.5 pr-3 font-medium text-right">PRs</th>
                      <th className="pb-1.5 pr-3 font-medium text-right">Authors</th>
                      <th className="pb-1.5 pr-3 font-medium text-right">Bug %</th>
                      <th className="pb-1.5 font-medium text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.coreAreas.stats
                      .slice(0, MAX_VISIBLE_ROWS)
                      .map((s) => {
                        const isCore = result.coreAreas.corePrefixes.includes(
                          s.prefix
                        );
                        return (
                          <tr
                            key={s.prefix}
                            className={`border-b last:border-0 ${isCore ? "font-medium" : "text-muted-foreground"}`}
                          >
                            <td className="py-1 pr-3 font-mono">
                              {s.prefix}
                              {isCore && (
                                <span className="ml-1 text-[10px] text-primary">
                                  core
                                </span>
                              )}
                            </td>
                            <td className="py-1 pr-3 text-right tabular-nums">
                              {s.prCount}
                            </td>
                            <td className="py-1 pr-3 text-right tabular-nums">
                              {s.distinctAuthors}
                            </td>
                            <td className="py-1 pr-3 text-right tabular-nums">
                              {(s.bugShare * 100).toFixed(1)}%
                            </td>
                            <td className="py-1 text-right tabular-nums">
                              {s.coreScore.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
