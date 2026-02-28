/**
 * Sprint 6 – "Why" summary generation.
 *
 * Builds compact, evidence-based bullet lists for top-5 engineers
 * by inspecting the already-computed pillar results. Purely derived
 * from existing outputs — no new data sources.
 */

import type {
  DeliveryImpactResult,
  ReliabilityImpactResult,
  TeamAccelerationImpactResult,
  OwnershipImpactResult,
  ExecutionQualityImpactResult,
  EngineerWhySummary,
} from "@/lib/types";

export interface BuildWhySummariesParams {
  top5Logins: string[];
  delivery: DeliveryImpactResult;
  reliability: ReliabilityImpactResult;
  teamAcceleration: TeamAccelerationImpactResult;
  ownership: OwnershipImpactResult;
  executionQuality: ExecutionQualityImpactResult;
}

export function buildWhySummaries(
  params: BuildWhySummariesParams
): EngineerWhySummary[] {
  const {
    top5Logins,
    delivery,
    reliability,
    teamAcceleration,
    ownership,
    executionQuality,
  } = params;

  return top5Logins.map((login) => ({
    engineerLogin: login,
    reasons: {
      delivery: deliveryReasons(login, delivery),
      reliability: reliabilityReasons(login, reliability),
      teamAcceleration: teamAccelerationReasons(login, teamAcceleration),
      ownership: ownershipReasons(login, ownership),
      executionQuality: executionQualityReasons(login, executionQuality),
    },
  }));
}

function deliveryReasons(
  login: string,
  result: DeliveryImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No delivery data for this engineer"];

  const reasons: string[] = [];
  reasons.push(
    `${eng.prCount} merged PRs, ${eng.rawPoints.toFixed(1)} weighted delivery points`
  );

  const corePrs = eng.attributions.filter((a) => a.isCoreTouched).length;
  if (corePrs > 0) {
    reasons.push(`Touched core areas in ${corePrs} PRs`);
  }

  const featurePrs = eng.attributions.filter((a) => a.hasFeatureLabel).length;
  if (featurePrs > 0) {
    reasons.push(`Feature-labeled PRs: ${featurePrs}`);
  }

  return reasons.slice(0, 3);
}

function reliabilityReasons(
  login: string,
  result: ReliabilityImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No reliability-qualifying PRs"];

  const reasons: string[] = [];
  const bugLike = eng.attributions.filter(
    (a) => a.triggers.labelBugLike
  ).length;
  if (bugLike > 0) {
    reasons.push(`Bug/regression/hotfix PRs: ${bugLike}`);
  }

  const revertLike = eng.attributions.filter(
    (a) => a.triggers.titleRevertLike
  ).length;
  if (revertLike > 0) {
    reasons.push(`Revert or rollback work: ${revertLike} PRs`);
  }

  const coreTouched = eng.attributions.filter((a) => a.coreTouched).length;
  if (coreTouched > 0) {
    reasons.push(`Core reliability work: ${coreTouched} PRs touched core`);
  }

  if (reasons.length === 0) {
    reasons.push(`${eng.prCount} qualifying reliability PRs`);
  }

  return reasons.slice(0, 3);
}

function teamAccelerationReasons(
  login: string,
  result: TeamAccelerationImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No review activity"];

  const reasons: string[] = [];
  reasons.push(`Reviews submitted: ${eng.reviewCount}`);

  if (eng.firstReviewCount > 0) {
    reasons.push(`First reviews: ${eng.firstReviewCount}`);
  }

  if (eng.medianResponseHours != null) {
    reasons.push(
      `Median first response: ${eng.medianResponseHours.toFixed(1)} hours`
    );
  }

  return reasons.slice(0, 3);
}

function ownershipReasons(
  login: string,
  result: OwnershipImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["Insufficient PR activity for ownership"];

  const reasons: string[] = [];
  reasons.push(`Owned area: ${eng.ownedPrefix}`);
  reasons.push(
    `Focus ratio: ${(eng.focusRatio * 100).toFixed(0)}%`
  );

  const parts: string[] = [];
  if (eng.activeWeeks > 0) parts.push(`Active weeks: ${eng.activeWeeks}`);
  if (eng.reviewsInOwnedArea > 0)
    parts.push(`Reviews in owned area: ${eng.reviewsInOwnedArea}`);
  if (parts.length > 0) reasons.push(parts.join(", "));

  return reasons.slice(0, 3);
}

function executionQualityReasons(
  login: string,
  result: ExecutionQualityImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No execution quality data"];

  const reasons: string[] = [];
  const { followUpFixCount, revertCount, churnPrCount } = eng.evidence;

  if (followUpFixCount > 0) {
    reasons.push(`Follow-up fixes within 14 days: ${followUpFixCount}`);
  } else {
    reasons.push("No follow-up fixes detected in last 90 days");
  }

  if (revertCount > 0) {
    reasons.push(`Reverts within 30 days: ${revertCount}`);
  } else {
    reasons.push("No reverts detected in last 90 days");
  }

  if (churnPrCount > 0) {
    reasons.push(`High churn PRs: ${churnPrCount}`);
  } else {
    reasons.push("No high-churn PRs detected");
  }

  return reasons.slice(0, 3);
}
