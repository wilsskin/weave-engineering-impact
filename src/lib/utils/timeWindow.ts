/**
 * Time window computation.
 * Provides the 90-day window boundaries used for data fetching
 * and displayed in the dashboard header.
 */

import { TIME_WINDOW_DAYS } from "@/lib/config/appConfig";

export interface TimeWindow {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

/**
 * Returns the scoring time window ending at `now`.
 * Start = now minus TIME_WINDOW_DAYS, End = now.
 * Both values are ISO-8601 date-time strings.
 */
export function getWindow(now: Date = new Date()): TimeWindow {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - TIME_WINDOW_DAYS);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
