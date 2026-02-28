/**
 * Sprint 6 – Pipeline validation.
 *
 * Runs cheap, deterministic sanity checks after scoring and returns
 * warnings for the UI. Never throws — returns an array of ValidationWarning.
 */

import type {
  NormalizedImpactInputs,
  CoreAreaResult,
  DeliveryImpactResult,
  ReliabilityImpactResult,
  TeamAccelerationImpactResult,
  OwnershipImpactResult,
  ExecutionQualityImpactResult,
  ImpactRankingResult,
  ValidationWarning,
  PillarKey,
} from "@/lib/types";

export interface ValidateImpactPipelineParams {
  inputs: NormalizedImpactInputs;
  core: CoreAreaResult;
  delivery: DeliveryImpactResult;
  reliability: ReliabilityImpactResult;
  teamAcceleration: TeamAccelerationImpactResult;
  ownership: OwnershipImpactResult;
  executionQuality: ExecutionQualityImpactResult;
  impact: ImpactRankingResult;
}

export function validateImpactPipeline(
  params: ValidateImpactPipelineParams
): ValidationWarning[] {
  const {
    inputs,
    core,
    delivery,
    reliability,
    teamAcceleration,
    ownership,
    executionQuality,
    impact,
  } = params;

  const warnings: ValidationWarning[] = [];

  if (inputs.pullRequests.length === 0) {
    warnings.push({
      code: "NO_PRS",
      message: "No merged pull requests found in the analysis window.",
      severity: "warn",
    });
  }

  if (core.corePrefixes.length === 0) {
    warnings.push({
      code: "NO_CORE_AREAS",
      message:
        "No core areas identified. All directory prefixes scored equally.",
      severity: "warn",
    });
  }

  const pillarResults: { key: PillarKey; count: number }[] = [
    { key: "delivery", count: delivery.engineerScores.length },
    { key: "reliability", count: reliability.engineerScores.length },
    { key: "teamAcceleration", count: teamAcceleration.engineerScores.length },
    { key: "ownership", count: ownership.engineerScores.length },
    { key: "executionQuality", count: executionQuality.engineerScores.length },
  ];

  for (const { key, count } of pillarResults) {
    if (count === 0) {
      warnings.push({
        code: `EMPTY_PILLAR_${key.toUpperCase()}`,
        message: `No engineer scores for pillar "${key}".`,
        severity: "warn",
      });
    }
  }

  const allScores = [
    ...delivery.engineerScores.map((e) => ({
      pillar: "delivery",
      login: e.engineerLogin,
      score: e.normalizedScore,
    })),
    ...reliability.engineerScores.map((e) => ({
      pillar: "reliability",
      login: e.engineerLogin,
      score: e.normalizedScore,
    })),
    ...teamAcceleration.engineerScores.map((e) => ({
      pillar: "teamAcceleration",
      login: e.engineerLogin,
      score: e.normalizedScore,
    })),
    ...ownership.engineerScores.map((e) => ({
      pillar: "ownership",
      login: e.engineerLogin,
      score: e.normalizedScore,
    })),
    ...executionQuality.engineerScores.map((e) => ({
      pillar: "executionQuality",
      login: e.engineerLogin,
      score: e.normalizedScore,
    })),
  ];

  const outOfRange = allScores.filter(
    (s) => s.score < 0 || s.score > 100
  );
  if (outOfRange.length > 0) {
    const examples = outOfRange
      .slice(0, 3)
      .map((s) => `${s.login}/${s.pillar}=${s.score.toFixed(1)}`)
      .join(", ");
    warnings.push({
      code: "SCORE_OUT_OF_RANGE",
      message: `Normalized scores outside 0–100 detected: ${examples}${outOfRange.length > 3 ? ` (+${outOfRange.length - 3} more)` : ""}.`,
      severity: "warn",
    });
  }

  if (impact.top5.length < 5 && impact.engineers.length >= 5) {
    warnings.push({
      code: "TOP5_INCOMPLETE",
      message: `Top 5 list has only ${impact.top5.length} entries despite ${impact.engineers.length} total engineers.`,
      severity: "warn",
    });
  }

  if (
    core.corePrefixes.length === 0 &&
    delivery.parameters.coreMultiplier > 1
  ) {
    warnings.push({
      code: "CORE_MULTIPLIER_NO_AREAS",
      message:
        "Delivery core multiplier > 1 but no core areas were identified.",
      severity: "info",
    });
  }

  if (
    core.corePrefixes.length === 0 &&
    reliability.parameters.coreMultiplier > 1
  ) {
    warnings.push({
      code: "RELIABILITY_CORE_MULTIPLIER_NO_AREAS",
      message:
        "Reliability core multiplier > 1 but no core areas were identified.",
      severity: "info",
    });
  }

  return warnings;
}
