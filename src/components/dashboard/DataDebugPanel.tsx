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

interface LoadResult {
  meta: { cachedAt: string };
  value: {
    repo: { owner: string; repo: string };
    windowStart: string;
    windowEnd: string;
    pullRequests: { number: number; title: string; author: { login: string } }[];
    reviews: { id: number }[];
    issues: { id: number }[];
  };
}

export function DataDebugPanel() {
  const [result, setResult] = useState<LoadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadData(refresh: boolean) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/impact-inputs${refresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: LoadResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Data Debug Panel</CardTitle>
        <CardDescription>
          Sprint 1 verification — fetch and inspect raw GitHub data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={() => loadData(false)} disabled={loading}>
            {loading ? "Loading\u2026" : "Load Data"}
          </Button>
          <Button
            variant="outline"
            onClick={() => loadData(true)}
            disabled={loading}
          >
            Force Refresh
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">
                Cached at {new Date(result.meta.cachedAt).toLocaleString()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <CountCard label="Pull Requests" count={result.value.pullRequests.length} />
              <CountCard label="Reviews" count={result.value.reviews.length} />
              <CountCard label="Issues" count={result.value.issues.length} />
            </div>

            {result.value.pullRequests.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Sample PRs (first 3)
                </p>
                <ul className="space-y-1 text-sm">
                  {result.value.pullRequests.slice(0, 3).map((pr) => (
                    <li key={pr.number} className="truncate">
                      <span className="font-mono text-muted-foreground">
                        #{pr.number}
                      </span>{" "}
                      {pr.title}{" "}
                      <span className="text-muted-foreground">
                        by {pr.author.login}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CountCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border px-3 py-2 text-center">
      <p className="text-2xl font-bold tabular-nums">{count}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
