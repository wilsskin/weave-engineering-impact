"use client";

import {
  PILLAR_WEIGHTS,
  TIME_WINDOW_DAYS,
  CORE_AREA_TOP_PERCENT,
  DELIVERY_SCORING,
  RELIABILITY_SCORING,
  TEAM_ACCELERATION_SCORING,
  OWNERSHIP_SCORING,
  EXECUTION_QUALITY_SCORING,
} from "@/lib/config/appConfig";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HowItWorks() {
  const deliveryWeight = (PILLAR_WEIGHTS.delivery * 100).toFixed(0);
  const reliabilityWeight = (PILLAR_WEIGHTS.reliability * 100).toFixed(0);
  const teamWeight = (PILLAR_WEIGHTS.teamAcceleration * 100).toFixed(0);
  const ownershipWeight = (PILLAR_WEIGHTS.ownership * 100).toFixed(0);
  const qualityWeight = (PILLAR_WEIGHTS.executionQuality * 100).toFixed(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">How it works</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8 text-sm">
        {/* Total impact score overview */}
        <section className="space-y-3">
          <h3 className="font-semibold text-foreground">
            Total impact score
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Every engineer gets a score from 0 to 100 for each of the five
            pillars below. We then take a weighted average to produce a single
            impact score. Delivery and reliability are weighted highest because
            they reflect shipped work and stability; team acceleration reflects
            how much you unblock others; ownership and execution quality round out
            sustained impact and code health.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Formula: Delivery × {deliveryWeight}% + Reliability × {reliabilityWeight}% +
            Team Acceleration × {teamWeight}% + Ownership × {ownershipWeight}% +
            Execution Quality × {qualityWeight}%. Each pillar score is 0–100
            before applying the weight.
          </p>
        </section>

        {/* Delivery */}
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">Delivery</h3>
          <p className="text-muted-foreground font-medium">Data from GitHub</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Pull requests: mergedAt, author, labels, changed files count or additions and deletions</li>
            <li>File paths for each PR to get directory prefix of changed files</li>
            <li>Core areas: directory prefixes ranked by activity and bug share; we take the top {CORE_AREA_TOP_PERCENT}% as core</li>
          </ul>
          <p className="text-muted-foreground font-medium pt-1">How we measure</p>
          <p className="text-muted-foreground leading-relaxed">
            We only count merged PRs in the last {TIME_WINDOW_DAYS} days. For each PR we assign a size bucket from the number of files changed (or lines added plus deleted if files are missing): xs to xl. Each bucket has a point value from 1 to 10. If the PR touches at least one core-area path we multiply by {DELIVERY_SCORING.coreAreaMultiplier}. If it has a feature, enhancement, frontend, or backend label we multiply by {DELIVERY_SCORING.featureLabelMultiplier}. We sum these weighted points per author.
          </p>
          <p className="text-muted-foreground font-medium pt-1">Normalization</p>
          <p className="text-muted-foreground leading-relaxed">
            Raw points per engineer are min-max scaled to 0–100 so the highest raw score becomes 100 and the lowest with any points stays above 0.
          </p>
        </section>

        {/* Reliability */}
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">Reliability</h3>
          <p className="text-muted-foreground font-medium">Data from GitHub</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Pull requests: mergedAt, author, title, labels, file paths</li>
            <li>Same core-area prefixes as Delivery</li>
            <li>Issues: we use issue numbers to detect issue references in PR titles</li>
          </ul>
          <p className="text-muted-foreground font-medium pt-1">How we measure</p>
          <p className="text-muted-foreground leading-relaxed">
            We only count merged PRs in the window. A PR counts toward reliability if it has a bug, regression, or hotfix label; or its title contains fix, hotfix, bug, or regression; or its title contains revert or rollback; or it references an issue by number. We add base points for labels and title keywords and a small bonus for issue references. We apply a severity multiplier from labels when present (e.g. critical, high). If the PR touches a core path we multiply by {RELIABILITY_SCORING.coreAreaMultiplier}. We sum raw points per author.
          </p>
          <p className="text-muted-foreground font-medium pt-1">Normalization</p>
          <p className="text-muted-foreground leading-relaxed">
            Raw points per engineer are min-max scaled to 0–100.
          </p>
        </section>

        {/* Team Acceleration */}
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">Team Acceleration</h3>
          <p className="text-muted-foreground font-medium">Data from GitHub</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Reviews: state, reviewer, submittedAt, body length, PR number</li>
            <li>Pull requests: author and creation time so we can compute time to first review</li>
          </ul>
          <p className="text-muted-foreground font-medium pt-1">How we measure</p>
          <p className="text-muted-foreground leading-relaxed">
            We only use reviews with state approved or changes requested; we exclude bots and the PR author. For each review we give base points, extra points if it is the first review on that PR, a depth score from review body length, and a responsiveness score from how quickly the first review happened. We sum these points per reviewer.
          </p>
          <p className="text-muted-foreground font-medium pt-1">Normalization</p>
          <p className="text-muted-foreground leading-relaxed">
            Raw points per engineer are min-max scaled to 0–100.
          </p>
        </section>

        {/* Ownership */}
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">Ownership</h3>
          <p className="text-muted-foreground font-medium">Data from GitHub</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Pull requests: mergedAt, author, file paths</li>
            <li>Reviews: reviewer, PR number</li>
          </ul>
          <p className="text-muted-foreground font-medium pt-1">How we measure</p>
          <p className="text-muted-foreground leading-relaxed">
            From each merged PR we take the primary directory prefix (the prefix where the most files changed). We count how many PRs each engineer has per prefix. Engineers need at least {OWNERSHIP_SCORING.minPrsForOwnership} merged PRs. We assign each engineer a primary prefix: the one with the most PRs. Focus ratio is PRs in that prefix divided by total PRs. We count distinct weeks with at least one merged PR and how many reviews they gave on PRs in their primary prefix. We combine focus, consistency over weeks, and reviews in area into raw points.
          </p>
          <p className="text-muted-foreground font-medium pt-1">Normalization</p>
          <p className="text-muted-foreground leading-relaxed">
            Raw points per engineer are min-max scaled to 0–100.
          </p>
        </section>

        {/* Execution Quality */}
        <section className="space-y-2">
          <h3 className="font-semibold text-foreground">Execution Quality</h3>
          <p className="text-muted-foreground font-medium">Data from GitHub</p>
          <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
            <li>Pull requests: mergedAt, author, title, labels, file paths</li>
            <li>Reviews: state changes requested, reviewer, PR number</li>
          </ul>
          <p className="text-muted-foreground font-medium pt-1">How we measure</p>
          <p className="text-muted-foreground leading-relaxed">
            We start each engineer at {EXECUTION_QUALITY_SCORING.startingScore}. We then apply penalties. A fix-type PR (title contains fix, hotfix, bug, or regression) merged within {EXECUTION_QUALITY_SCORING.followUpFixWindowDays} days of a prior PR in the same path prefix adds a penalty. A revert-type PR (revert or rollback in title) that references or follows another PR within {EXECUTION_QUALITY_SCORING.revertWindowDays} days adds a penalty. Each PR that received more than {EXECUTION_QUALITY_SCORING.churnThresholdChangesRequested} reviews with state changes requested adds a penalty. The total penalty is capped. We subtract from the starting score and floor at 0.
          </p>
          <p className="text-muted-foreground font-medium pt-1">Normalization</p>
          <p className="text-muted-foreground leading-relaxed">
            These post-penalty scores are min-max scaled to 0–100 so they sit on the same scale as the other pillars before we apply the weights.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
