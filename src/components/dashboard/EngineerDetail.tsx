"use client";

import type {
  ImpactEngineerResult,
  EngineerWhySummary,
  PillarKey,
} from "@/lib/types";

const PILLAR_LABELS: Record<PillarKey, string> = {
  delivery: "Delivery",
  reliability: "Reliability",
  teamAcceleration: "Team Acceleration",
  ownership: "Ownership",
  executionQuality: "Execution Quality",
};

const PILLAR_ORDER: PillarKey[] = [
  "delivery",
  "reliability",
  "teamAcceleration",
  "ownership",
  "executionQuality",
];

interface EngineerDetailProps {
  engineer: ImpactEngineerResult;
  whySummary?: EngineerWhySummary | null;
}

export function EngineerDetail({ engineer, whySummary }: EngineerDetailProps) {
  return (
    <div className="space-y-5">
      {/* Row 1: identity + score */}
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
      </div>

      {/* Row 2: five pillar cards (2 per row) with stats under each */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {PILLAR_ORDER.map((pillarKey) => {
          const pillar = engineer.pillars.find((p) => p.pillar === pillarKey);
          const reasons = whySummary?.reasons[pillarKey] ?? [];
          return (
            <div key={pillarKey} className="space-y-2">
              <div className="rounded-lg border border-border/60 px-2.5 py-2 text-center">
                <p className="text-[10px] font-medium text-muted-foreground leading-tight mb-1">
                  {PILLAR_LABELS[pillarKey]}
                </p>
                <p className="text-base font-semibold tabular-nums">
                  {pillar ? Math.round(pillar.normalizedScore) : "—"}
                </p>
              </div>
              {reasons.length > 0 && (
                <ul className="space-y-0.5">
                  {reasons.map((b, i) => (
                    <li
                      key={i}
                      className="text-[11px] text-muted-foreground leading-snug"
                    >
                      • {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
