"use client";

import type { ImpactEngineerResult, PillarKey } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const PILLAR_LABELS: Record<PillarKey, string> = {
  delivery: "Delivery",
  reliability: "Reliability",
  teamAcceleration: "Team Acceleration",
  ownership: "Ownership",
  executionQuality: "Execution Quality",
};

interface EngineerDetailProps {
  engineer: ImpactEngineerResult;
}

export function EngineerDetail({ engineer }: EngineerDetailProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_1.4fr]">
      {/* Left: identity + headline */}
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            #{engineer.rank}
          </p>
          <h3 className="text-lg font-semibold font-mono leading-tight">
            {engineer.engineerLogin}
          </h3>
        </div>
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          {engineer.finalScore.toFixed(2)}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {engineer.notes.topPillars.map((p) => (
            <Badge key={p} variant="secondary" className="text-xs">
              {PILLAR_LABELS[p]}
            </Badge>
          ))}
        </div>
      </div>

      {/* Right: pillar grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {engineer.pillars.map((p) => (
            <div
              key={p.pillar}
              className="rounded-lg border border-border/60 px-2.5 py-2 text-center"
            >
              <p className="text-[10px] font-medium text-muted-foreground leading-tight mb-1">
                {PILLAR_LABELS[p.pillar]}
              </p>
              <p className="text-base font-semibold tabular-nums">
                {Math.round(p.normalizedScore)}
              </p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {(p.weight * 100).toFixed(0)}% &rarr; {p.weightedContribution.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Explanation math */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            How this score was calculated
          </p>
          <ul className="space-y-0.5 font-mono text-xs text-muted-foreground">
            {engineer.notes.explanation.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
            <li className="mt-1 font-semibold text-foreground">
              Final Impact Score = {engineer.finalScore.toFixed(2)}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
