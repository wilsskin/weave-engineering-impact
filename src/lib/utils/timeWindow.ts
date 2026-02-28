/**
 * Time window computation.
 * Provides the 90-day window boundaries used for data fetching
 * and displayed in the dashboard header.
 *
 * Boundaries are snapped to UTC day boundaries so the cache key
 * stays stable within a single calendar day.
 */

import { TIME_WINDOW_DAYS } from "@/lib/config/appConfig";

export interface TimeWindow {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

/**
 * Returns the scoring time window ending at the end of today (UTC).
 * Start = today minus TIME_WINDOW_DAYS at 00:00:00 UTC
 * End   = today at 23:59:59.999 UTC
 *
 * Snapping to day boundaries ensures the cache key is identical
 * for all requests on the same calendar day.
 */
export function getWindow(now: Date = new Date()): TimeWindow {
  const endDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ));

  const startDay = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - TIME_WINDOW_DAYS,
    0, 0, 0, 0
  ));

  return {
    start: startDay.toISOString(),
    end: endDay.toISOString(),
  };
}
