"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface EnrichmentProgress {
  enrichedPrs: number;
  totalPrs: number;
  isComplete: boolean;
}

interface DataStatusMeta {
  cachedAt: string;
  isStale?: boolean;
  staleReason?: string;
  rateLimitResetAt?: string;
  enrichmentProgress?: EnrichmentProgress;
}

interface DataStatusProps {
  meta: DataStatusMeta;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

const REASON_LABELS: Record<string, { label: string; icon: typeof Info }> = {
  rateLimit: { label: "Rate limited — showing cached data", icon: AlertTriangle },
  cooldown: { label: "Cooldown active — showing cached data", icon: Clock },
  errorFallback: { label: "Fetch error — showing cached data", icon: AlertTriangle },
};

export function DataStatus({ meta }: DataStatusProps) {
  const reason = meta.staleReason ? REASON_LABELS[meta.staleReason] : null;
  const progress = meta.enrichmentProgress;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {progress ? (
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {progress.enrichedPrs} of {progress.totalPrs} PRs cached
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          Cached data
        </span>
      )}

      {progress && progress.isComplete && (
        <Badge
          variant="outline"
          className="gap-1 border-green-500/40 text-green-600 text-[10px]"
        >
          <CheckCircle2 className="size-3" />
          Complete
        </Badge>
      )}

      {progress && !progress.isComplete && (
        <Badge
          variant="outline"
          className="gap-1 border-blue-500/40 text-blue-600 text-[10px]"
        >
          <Info className="size-3" />
          Click Refresh to fetch more
        </Badge>
      )}

      {meta.isStale && reason && (
        <Badge
          variant="outline"
          className="gap-1 border-amber-500/40 text-amber-600 text-[10px]"
        >
          <reason.icon className="size-3" />
          {reason.label}
        </Badge>
      )}

      {meta.rateLimitResetAt && (
        <span className="text-amber-600">
          Next refresh available at {formatTime(meta.rateLimitResetAt)}
        </span>
      )}
    </div>
  );
}

/**
 * Returns true if the refresh button should be disabled based on meta state.
 */
export function isRefreshBlocked(meta: DataStatusMeta): boolean {
  if (meta.staleReason === "cooldown") return true;
  if (meta.rateLimitResetAt) {
    const resetTime = new Date(meta.rateLimitResetAt).getTime();
    if (Date.now() < resetTime) return true;
  }
  return false;
}
