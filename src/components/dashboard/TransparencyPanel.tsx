"use client";

import type { ImpactTransparencyBundle, PillarKey } from "@/lib/types";

const PILLAR_LABELS: Record<PillarKey, string> = {
  delivery: "Delivery",
  reliability: "Reliability",
  teamAcceleration: "Team Acceleration",
  ownership: "Ownership",
  executionQuality: "Execution Quality",
};
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TransparencyPanelProps {
  transparency: ImpactTransparencyBundle;
  selectedLogin: string;
}

export function TransparencyPanel({
  transparency,
  selectedLogin,
}: TransparencyPanelProps) {
  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full">
        {/* Model parameters (collapsed by default) */}
        <AccordionItem value="parameters" className="border-border/60">
          <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:no-underline">
            Model Parameters
          </AccordionTrigger>
          <AccordionContent>
            <ParametersSection transparency={transparency} />
          </AccordionContent>
        </AccordionItem>

        {/* Validation warnings */}
        {transparency.validations.length > 0 && (
          <AccordionItem value="validations" className="border-border/60">
            <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:no-underline">
              Validation
              <Badge
                variant="outline"
                className="ml-2 text-[10px] tabular-nums"
              >
                {transparency.validations.length}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-1.5">
                {transparency.validations.map((v, i) => (
                  <li
                    key={`${v.code}-${i}`}
                    className="flex items-start gap-2 text-xs"
                  >
                    <Badge
                      variant={v.severity === "warn" ? "destructive" : "secondary"}
                      className="mt-0.5 shrink-0 text-[10px]"
                    >
                      {v.severity}
                    </Badge>
                    <span className="text-muted-foreground">{v.message}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {transparency.validations.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No validation warnings
        </p>
      )}
    </div>
  );
}

function ParametersSection({
  transparency,
}: {
  transparency: ImpactTransparencyBundle;
}) {
  const { parameters } = transparency;

  return (
    <div className="space-y-3 text-xs text-muted-foreground">
      <div>
        <p className="font-medium text-foreground mb-1">Weights</p>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {(Object.entries(parameters.pillarWeights) as [PillarKey, number][]).map(
            ([key, weight]) => (
              <span key={key}>
                {PILLAR_LABELS[key]}: {(weight * 100).toFixed(0)}%
              </span>
            )
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span>
          Time window: {parameters.timeWindowDays} days
        </span>
        <span>
          Core area threshold: top {parameters.coreAreaTopPercent}%
        </span>
      </div>

      <div>
        <p className="font-medium text-foreground mb-1">Delivery</p>
        <span>
          Core multiplier: {parameters.delivery.coreMultiplier}x,
          Feature multiplier: {parameters.delivery.featureMultiplier}x
        </span>
      </div>

      <div>
        <p className="font-medium text-foreground mb-1">Reliability</p>
        <span>
          Core multiplier: {parameters.reliability.coreMultiplier}x
        </span>
      </div>

      <div>
        <p className="font-medium text-foreground mb-1">Execution Quality</p>
        <span>
          Starting score: {parameters.executionQuality.startingScore},
          Fix window: {parameters.executionQuality.followUpFixWindowDays}d,
          Revert window: {parameters.executionQuality.revertWindowDays}d,
          Max penalty: {parameters.executionQuality.maxTotalPenalty}
        </span>
      </div>
    </div>
  );
}
