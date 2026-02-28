import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_REPO, TIME_WINDOW_DAYS, PILLAR_WEIGHTS } from "@/lib/config/appConfig";
import { getWindow } from "@/lib/utils/timeWindow";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const PILLAR_LABELS: Record<string, string> = {
  delivery: "Delivery Impact",
  reliability: "Reliability & Crisis Response",
  teamAcceleration: "Team Acceleration",
  ownership: "Ownership & Depth",
  executionQuality: "Execution Quality",
};

export default function Home() {
  const window = getWindow();

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-12 sm:px-8">
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Engineering Impact Dashboard
          </h1>
          <p className="text-muted-foreground">
            Identifying the top 5 most impactful engineers using a transparent,
            five-pillar scoring model over the last {TIME_WINDOW_DAYS} days of
            GitHub activity.
          </p>
        </div>

        {/* Repo & Window Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Repository</CardTitle>
            <CardDescription>
              Data source and analysis window
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Repo
              </span>
              <Badge variant="secondary" className="font-mono text-sm">
                {DEFAULT_REPO.owner}/{DEFAULT_REPO.repo}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Window
              </span>
              <span className="text-sm">
                {formatDate(window.start)} &mdash; {formatDate(window.end)}
              </span>
              <Badge variant="outline" className="text-xs">
                {TIME_WINDOW_DAYS} days
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Scoring Model Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scoring Model</CardTitle>
            <CardDescription>
              Five weighted pillars — no ML, no LOC counting, fully transparent
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(PILLAR_WEIGHTS).map(([key, weight]) => (
                <li key={key} className="flex items-center justify-between">
                  <span className="text-sm">
                    {PILLAR_LABELS[key] ?? key}
                  </span>
                  <Badge variant="outline" className="tabular-nums">
                    {(weight * 100).toFixed(0)}%
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Sprint 1 Notice */}
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Data fetching and scoring begin in Sprint 1.
            This shell confirms the project scaffold is running.
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
