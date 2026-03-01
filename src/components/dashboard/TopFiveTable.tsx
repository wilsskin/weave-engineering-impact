"use client";

import { useCallback, useRef } from "react";
import type { ImpactEngineerResult } from "@/lib/types";

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

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        role="grid"
        aria-label="Engineers by impact score"
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
                className="border-b border-border/50 last:border-0 cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset hover:bg-muted/50 data-[selected=true]:bg-muted/50"
                data-selected={isSelected}
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
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
