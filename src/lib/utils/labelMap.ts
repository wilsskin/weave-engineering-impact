/**
 * Label normalization and categorization.
 * Provides a best-effort mapping from arbitrary GitHub labels
 * to the categories referenced by the scoring pillars.
 */

import {
  LABEL_CATEGORY_MAP,
  type LabelCategory,
} from "@/lib/config/appConfig";

/**
 * Normalizes a raw label string: lowercase, trim, collapse whitespace,
 * replace underscores with spaces.
 */
export function normalizeLabel(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Maps a normalized label to a scoring category.
 * Falls back to "unknown" when no match is found.
 */
export function labelCategory(raw: string): LabelCategory {
  const normalized = normalizeLabel(raw);
  return LABEL_CATEGORY_MAP[normalized] ?? "unknown";
}
