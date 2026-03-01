/**
 * High-level "why this score" bullets per pillar. Short, specific, no jargon.
 * Detailed methodology lives in the How it works section.
 */

import { appConfig } from "@/lib/config/appConfig";
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
  if (!eng) return ["No delivery data"];

  const reasons: string[] = [];
  reasons.push(`${eng.prCount} merged PRs in window`);

  const corePrs = eng.attributions.filter((a) => a.isCoreTouched).length;
  if (corePrs > 0) {
    reasons.push(`${corePrs} PRs touched high-activity code areas`);
  }

  const featurePrs = eng.attributions.filter((a) => a.hasFeatureLabel).length;
  if (featurePrs > 0) {
    reasons.push(`${featurePrs} PRs had feature or enhancement labels`);
  }

  return reasons.slice(0, 3);
}

function reliabilityReasons(
  login: string,
  result: ReliabilityImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No qualifying PRs"];

  const reasons: string[] = [];
  reasons.push(`${eng.prCount} PRs counted for reliability`);

  const bugLike = eng.attributions.filter((a) => a.triggers.labelBugLike).length;
  if (bugLike > 0) {
    reasons.push(`${bugLike} with bug, regression, or hotfix label`);
  }

  const revertLike = eng.attributions.filter(
    (a) => a.triggers.titleRevertLike
  ).length;
  if (revertLike > 0) {
    reasons.push(`${revertLike} with revert or rollback in title`);
  }

  const coreTouched = eng.attributions.filter((a) => a.coreTouched).length;
  if (coreTouched > 0) {
    reasons.push(`${coreTouched} in high-activity areas`);
  }

  return reasons.slice(0, 4);
}

function teamAccelerationReasons(
  login: string,
  result: TeamAccelerationImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No review activity"];

  const reasons: string[] = [];
  reasons.push(`${eng.reviewCount} reviews submitted`);
  if (eng.firstReviewCount > 0) {
    reasons.push(`${eng.firstReviewCount} first reviews on PRs`);
  }
  if (eng.medianResponseHours != null) {
    reasons.push(`Median ${eng.medianResponseHours.toFixed(1)} hours to first review`);
  }
  return reasons.slice(0, 3);
}

function ownershipReasons(
  login: string,
  result: OwnershipImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["Insufficient PR activity"];

  const reasons: string[] = [];
  reasons.push(`Most active in ${eng.ownedPrefix}`);
  reasons.push(`Focus ratio ${eng.ownedAreaPrCount} of ${eng.totalPrCount} PRs`);

  if (eng.activeWeeks > 0) {
    reasons.push(`Active in ${eng.activeWeeks} week${eng.activeWeeks === 1 ? "" : "s"}`);
  }
  if (eng.reviewsInOwnedArea > 0) {
    reasons.push(`${eng.reviewsInOwnedArea} reviews in ${eng.ownedPrefix}`);
  }
  return reasons.slice(0, 4);
}

function executionQualityReasons(
  login: string,
  result: ExecutionQualityImpactResult
): string[] {
  const eng = result.engineerScores.find((e) => e.engineerLogin === login);
  if (!eng) return ["No data"];

  const scoring = appConfig.executionQualityScoring;
  const reasons: string[] = [];
  const { followUpFixCount, revertCount, churnPrCount } = eng.evidence;

  reasons.push(
    `${followUpFixCount} fix-type PRs within ${scoring.followUpFixWindowDays} days of prior work`
  );
  reasons.push(`${revertCount} reverts within ${scoring.revertWindowDays} days`);
  reasons.push(
    `${churnPrCount} PRs with ${scoring.churnThresholdChangesRequested + 1}+ change requests`
  );
  return reasons.slice(0, 3);
}
