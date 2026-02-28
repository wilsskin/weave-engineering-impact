/**
 * Deterministic JSON disk cache with TTL and atomic writes.
 * Keyed by a string that encodes repo + window + version so stale
 * entries from different runs never collide.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { CACHE_DIR, CACHE_TTL_MS } from "@/lib/config/appConfig";

export type CacheMeta = { cachedAt: string };

interface CacheEnvelope<T> {
  meta: CacheMeta;
  payload: T;
}

function cacheFilePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_\-:.]/g, "_");
  return path.resolve(process.cwd(), CACHE_DIR, `${safeKey}.json`);
}

async function ensureCacheDir(): Promise<void> {
  const dir = path.resolve(process.cwd(), CACHE_DIR);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Reads a cached value if it exists and hasn't expired.
 * Returns null on miss, expiry, or any read error.
 */
export async function readCache<T>(
  key: string
): Promise<{ meta: CacheMeta; value: T } | null> {
  try {
    const filePath = cacheFilePath(key);
    const raw = await fs.readFile(filePath, "utf-8");
    const envelope: CacheEnvelope<T> = JSON.parse(raw);

    const age = Date.now() - new Date(envelope.meta.cachedAt).getTime();
    if (age > CACHE_TTL_MS) return null;

    return { meta: envelope.meta, value: envelope.payload };
  } catch {
    return null;
  }
}

/**
 * Writes a value to the cache using atomic write (temp + rename)
 * to prevent corrupted partial files.
 */
export async function writeCache<T>(
  key: string,
  value: T
): Promise<{ meta: CacheMeta }> {
  await ensureCacheDir();

  const meta: CacheMeta = { cachedAt: new Date().toISOString() };
  const envelope: CacheEnvelope<T> = { meta, payload: value };
  const json = JSON.stringify(envelope, null, 2);

  const filePath = cacheFilePath(key);
  const tmpPath = path.join(
    os.tmpdir(),
    `cache-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );

  await fs.writeFile(tmpPath, json, "utf-8");
  await ensureCacheDir();
  await fs.rename(tmpPath, filePath).catch(async () => {
    // rename across filesystems fails — fall back to copy + delete
    await fs.copyFile(tmpPath, filePath);
    await fs.unlink(tmpPath).catch(() => {});
  });

  return { meta };
}

/**
 * Cache-through helper: returns cached value if fresh and refresh=false,
 * otherwise invokes loader, caches the result, and returns it.
 */
export async function getOrSetCache<T>(
  key: string,
  refresh: boolean,
  loader: () => Promise<T>
): Promise<{ meta: CacheMeta; value: T }> {
  if (!refresh) {
    const cached = await readCache<T>(key);
    if (cached) return cached;
  }

  const value = await loader();
  const { meta } = await writeCache(key, value);
  return { meta, value };
}
