"use client";

import { useCallback, useRef } from "react";
import type { ImpactEngineerResult, PillarKey } from "@/lib/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PILLAR_COLS: {
  key: PillarKey;
  label: string;
  abbr: string;
  tip: string;
}[] = [
  {
    key: "delivery",
    label: "Delivery",
    abbr: "Del",
    tip: "Shipped work weighted by size, core areas, and feature labels",
  },
  {
    key: "reliability",
    label: "Reliability",
    abbr: "Rel",
    tip: "Bug fixes, reverts, severity multipliers, and core impact",
  },
  {
    key: "teamAcceleration",
    label: "Acceleration",
    abbr: "Acc",
    tip: "Review volume, depth, and responsiveness to others' PRs",
  },
  {
    key: "ownership",
    label: "Ownership",
    abbr: "Own",
    tip: "Sustained subsystem focus and stewardship consistency",
  },
  {
    key: "executionQuality",
    label: "Quality",
    abbr: "Qual",
    tip: "Penalties for churn, reverts, and follow-up fixes",
  },
];

interface TopFiveTableProps {
  engineers: ImpactEngineerResult[];
  selectedLogin: string;
  onSelect: (login: string) => void;
}

export function TopFiveTable({
  engineers,
  selectedLogin,
  onSelect,
}: TopFiveTableProps) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
      const currentIdx = engineers.findIndex(
        (eng) => eng.engineerLogin === selectedLogin
      );
      let nextIdx = currentIdx;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = Math.min(currentIdx + 1, engineers.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = Math.max(currentIdx - 1, 0);
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIdx = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIdx = engineers.length - 1;
      } else {
        return;
      }

      if (nextIdx !== currentIdx) {
        onSelect(engineers[nextIdx].engineerLogin);
        const rows = tbodyRef.current?.querySelectorAll("tr");
        rows?.[nextIdx]?.focus();
      }
    },
    [engineers, selectedLogin, onSelect]
  );

  function pillarScore(eng: ImpactEngineerResult, key: PillarKey): number {
    return (
      eng.pillars.find((p) => p.pillar === key)?.normalizedScore ?? 0
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="overflow-x-auto">
        <table
          className="w-full"
          role="grid"
          aria-label="Top 5 engineers by impact score"
        >
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-2 text-xs font-medium text-muted-foreground w-10">
                #
              </th>
              <th className="pb-2 pr-3 text-xs font-medium text-muted-foreground">
                Engineer
              </th>
              <th className="pb-2 pr-3 text-right text-xs font-medium text-muted-foreground">
                Score
              </th>
              {PILLAR_COLS.map((col) => (
                <th
                  key={col.key}
                  className="pb-2 pr-2 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="cursor-help border-b border-dotted border-muted-foreground/40"
                        tabIndex={0}
                      >
                        {col.abbr}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      <p className="font-medium">{col.label}</p>
                      <p className="text-muted-foreground">{col.tip}</p>
                    </TooltipContent>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <tbody ref={tbodyRef} onKeyDown={handleKeyDown}>
            {engineers.map((eng) => {
              const isSelected = eng.engineerLogin === selectedLogin;
              return (
                <tr
                  key={eng.engineerLogin}
                  role="row"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  onClick={() => onSelect(eng.engineerLogin)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(eng.engineerLogin);
                    }
                  }}
                  className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors outline-none
                    focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset
                    ${isSelected ? "bg-muted/60" : "hover:bg-muted/30"}`}
                >
                  <td className="py-2.5 pr-2 tabular-nums text-sm text-muted-foreground font-medium">
                    {eng.rank}
                  </td>
                  <td className="py-2.5 pr-3 text-sm font-medium font-mono">
                    {eng.engineerLogin}
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-sm font-semibold">
                    {eng.finalScore.toFixed(2)}
                  </td>
                  {PILLAR_COLS.map((col) => (
                    <td
                      key={col.key}
                      className="py-2.5 pr-2 text-right tabular-nums text-sm text-muted-foreground hidden sm:table-cell"
                    >
                      {Math.round(pillarScore(eng, col.key))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  );
}
