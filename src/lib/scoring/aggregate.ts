/**
 * Sprint 4 – Final aggregation and ranking.
 *
 * Combines the five pillar normalized scores (0–100) into a single
 * weighted Final Impact Score per engineer, then ranks them.
 *
 * Final Impact Score =
 *   0.30 * Delivery + 0.20 * Reliability + 0.20 * TeamAcceleration
 * + 0.15 * Ownership + 0.15 * ExecutionQuality
 */

import { appConfig } from "@/lib/config/appConfig";
import type {
  PillarKey,
  PillarScoreSummary,
  ImpactEngineerResult,
  ImpactRankingResult,
  DeliveryImpactResult,
  ReliabilityImpactResult,
  TeamAccelerationImpactResult,
  OwnershipImpactResult,
  ExecutionQualityImpactResult,
} from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────────

function round2(n: number): number {
  return parseFloat(n.toFixed(2));
}

type PillarResult =
  | DeliveryImpactResult
  | ReliabilityImpactResult
  | TeamAccelerationImpactResult
  | OwnershipImpactResult
  | ExecutionQualityImpactResult;

function validateWindowsMatch(results: PillarResult[]): void {
  const ref = results[0];
  for (let i = 1; i < results.length; i++) {
    const r = results[i];
    if (
      r.repo.owner !== ref.repo.owner ||
      r.repo.repo !== ref.repo.repo ||
      r.windowStart !== ref.windowStart ||
      r.windowEnd !== ref.windowEnd
    ) {
      throw new Error(
        `Pillar window mismatch: ${ref.pillar} (${ref.repo.owner}/${ref.repo.repo} ` +
          `${ref.windowStart}–${ref.windowEnd}) vs ${r.pillar} (${r.repo.owner}/${r.repo.repo} ` +
          `${r.windowStart}–${r.windowEnd})`
      );
    }
  }
}

// ── Aggregation entry point ────────────────────────────────────

export interface AggregateImpactParams {
  delivery: DeliveryImpactResult;
  reliability: ReliabilityImpactResult;
  teamAcceleration: TeamAccelerationImpactResult;
  ownership: OwnershipImpactResult;
  executionQuality: ExecutionQualityImpactResult;
  weights?: Record<PillarKey, number>;
}

export function aggregateImpactScores(
  params: AggregateImpactParams
): ImpactRankingResult {
  const {
    delivery,
    reliability,
    teamAcceleration,
    ownership,
    executionQuality,
  } = params;

  const weights: Record<PillarKey, number> =
    params.weights ?? { ...appConfig.pillarWeights };

  const allResults: PillarResult[] = [
    delivery,
    reliability,
    teamAcceleration,
    ownership,
    executionQuality,
  ];
  validateWindowsMatch(allResults);

  // A) Build unified engineer set
  const scoreMap: Record<PillarKey, Map<string, number>> = {
    delivery: new Map(),
    reliability: new Map(),
    teamAcceleration: new Map(),
    ownership: new Map(),
    executionQuality: new Map(),
  };

  for (const eng of delivery.engineerScores) {
    scoreMap.delivery.set(eng.engineerLogin, eng.normalizedScore);
  }
  for (const eng of reliability.engineerScores) {
    scoreMap.reliability.set(eng.engineerLogin, eng.normalizedScore);
  }
  for (const eng of teamAcceleration.engineerScores) {
    scoreMap.teamAcceleration.set(eng.engineerLogin, eng.normalizedScore);
  }
  for (const eng of ownership.engineerScores) {
    scoreMap.ownership.set(eng.engineerLogin, eng.normalizedScore);
  }
  for (const eng of executionQuality.engineerScores) {
    scoreMap.executionQuality.set(eng.engineerLogin, eng.normalizedScore);
  }

  const allLogins = new Set<string>();
  for (const map of Object.values(scoreMap)) {
    for (const login of map.keys()) {
      allLogins.add(login);
    }
  }

  // B–F) Compute per-engineer results
  const pillarKeys: PillarKey[] = [
    "delivery",
    "reliability",
    "teamAcceleration",
    "ownership",
    "executionQuality",
  ];

  const unsorted: ImpactEngineerResult[] = [];

  for (const login of allLogins) {
    const pillars: PillarScoreSummary[] = pillarKeys.map((key) => {
      const normalizedScore = scoreMap[key].get(login) ?? 0;
      const weight = weights[key];
      const weightedContribution = round2(normalizedScore * weight);
      return { pillar: key, normalizedScore, weight, weightedContribution };
    });

    const finalScore = round2(
      pillars.reduce((sum, p) => sum + p.normalizedScore * p.weight, 0)
    );

    // F) Transparency
    const sorted = [...pillars].sort(
      (a, b) => b.weightedContribution - a.weightedContribution
    );
    const topPillars: PillarKey[] = sorted.slice(0, 2).map((p) => p.pillar);

    const explanation = pillars.map(
      (p) =>
        `${capitalize(p.pillar)}: ${p.normalizedScore.toFixed(0)} * ${p.weight.toFixed(2)} = ${p.weightedContribution.toFixed(2)}`
    );

    unsorted.push({
      engineerLogin: login,
      finalScore,
      rank: 0,
      pillars,
      notes: { topPillars, explanation },
    });
  }

  // D) Sort with tie-break
  unsorted.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;

    const aDelivery =
      a.pillars.find((p) => p.pillar === "delivery")?.weightedContribution ?? 0;
    const bDelivery =
      b.pillars.find((p) => p.pillar === "delivery")?.weightedContribution ?? 0;
    if (bDelivery !== aDelivery) return bDelivery - aDelivery;

    const aReliability =
      a.pillars.find((p) => p.pillar === "reliability")
        ?.weightedContribution ?? 0;
    const bReliability =
      b.pillars.find((p) => p.pillar === "reliability")
        ?.weightedContribution ?? 0;
    if (bReliability !== aReliability) return bReliability - aReliability;

    return a.engineerLogin.localeCompare(b.engineerLogin);
  });

  // Assign ranks
  for (let i = 0; i < unsorted.length; i++) {
    unsorted[i].rank = i + 1;
  }

  const ref = delivery;

  return {
    repo: ref.repo,
    windowStart: ref.windowStart,
    windowEnd: ref.windowEnd,
    weights,
    engineers: unsorted,
    top5: unsorted.slice(0, 5),
  };
}

// ── Util ───────────────────────────────────────────────────────

const PILLAR_DISPLAY: Record<PillarKey, string> = {
  delivery: "Delivery",
  reliability: "Reliability",
  teamAcceleration: "Team Acceleration",
  ownership: "Ownership",
  executionQuality: "Execution Quality",
};

function capitalize(key: PillarKey): string {
  return PILLAR_DISPLAY[key];
}
