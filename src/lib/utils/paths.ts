/**
 * File path utilities.
 * Extracts directory prefixes used by the Core Area engine
 * and converts raw path strings into FilePathLite objects.
 */

import type { FilePathLite } from "@/lib/types";

/**
 * Extracts the first directory segment from a file path.
 * e.g. "frontend/src/components/Button.tsx" → "frontend"
 * Files in the repo root (no slash) return "root".
 */
export function extractPrefix(filePath: string): string {
  const trimmed = filePath.replace(/^\/+/, "");
  const firstSlash = trimmed.indexOf("/");
  if (firstSlash === -1) return "root";
  return trimmed.slice(0, firstSlash);
}

/**
 * Returns the file extension without the leading dot.
 * e.g. "Button.tsx" → "tsx", "Makefile" → ""
 */
export function fileExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const lastSlash = filePath.lastIndexOf("/");
  if (lastDot === -1 || lastDot < lastSlash) return "";
  return filePath.slice(lastDot + 1);
}

/** Converts a raw path string into a FilePathLite object. */
export function filePathToLite(filePath: string): FilePathLite {
  return {
    path: filePath,
    prefix: extractPrefix(filePath),
    extension: fileExtension(filePath),
  };
}
