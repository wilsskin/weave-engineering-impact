/**
 * Cache abstraction with pluggable backends.
 *
 * - Disk (default): CACHE_DIR (data/impact-dashboard-cache) — committed to git
 *   so the deployed app can serve cached data. Writes are best-effort (e.g. read-only on Vercel).
 * - Production + KV: KvCacheBackend when KV_REST_API_* env are set (Vercel KV / Upstash Redis).
 *
 * The active backend is selected automatically via getCacheBackend().
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { CACHE_DIR, CACHE_TTL_MS } from "@/lib/config/appConfig";

// ── Shared types ───────────────────────────────────────────────

export type CacheMeta = {
  cachedAt: string;
  isStale?: boolean;
  staleReason?: "rateLimit" | "errorFallback" | "cooldown";
  rateLimitResetAt?: string;
  enrichmentProgress?: {
    enrichedPrs: number;
    totalPrs: number;
    isComplete: boolean;
  };
};

interface CacheEnvelope<T> {
  meta: CacheMeta;
  payload: T;
}

export interface CacheBackend {
  get<T>(key: string): Promise<{ meta: CacheMeta; value: T } | null>;
  set<T>(key: string, value: T): Promise<{ meta: CacheMeta }>;
  /** Read even if TTL expired — used for stale fallback. */
  getIgnoreTtl<T>(key: string): Promise<{ meta: CacheMeta; value: T } | null>;
}

// ── Disk backend (local dev) ───────────────────────────────────

function cacheFilePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_\-:.]/g, "_");
  return path.resolve(process.cwd(), CACHE_DIR, `${safeKey}.json`);
}

async function ensureCacheDir(): Promise<void> {
  const dir = path.resolve(process.cwd(), CACHE_DIR);
  await fs.mkdir(dir, { recursive: true });
}

class DiskCacheBackend implements CacheBackend {
  async get<T>(key: string): Promise<{ meta: CacheMeta; value: T } | null> {
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

  async getIgnoreTtl<T>(
    key: string
  ): Promise<{ meta: CacheMeta; value: T } | null> {
    try {
      const filePath = cacheFilePath(key);
      const raw = await fs.readFile(filePath, "utf-8");
      const envelope: CacheEnvelope<T> = JSON.parse(raw);
      return { meta: envelope.meta, value: envelope.payload };
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<{ meta: CacheMeta }> {
    const meta: CacheMeta = { cachedAt: new Date().toISOString() };
    const envelope: CacheEnvelope<T> = { meta, payload: value };
    const json = JSON.stringify(envelope, null, 2);

    const filePath = cacheFilePath(key);
    const tmpPath = path.join(
      os.tmpdir(),
      `cache-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );

    try {
      await fs.writeFile(tmpPath, json, "utf-8");
      await ensureCacheDir();
      await fs.rename(tmpPath, filePath).catch(async () => {
        await fs.copyFile(tmpPath, filePath);
        await fs.unlink(tmpPath).catch(() => {});
      });
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : null;
      if (code === "EACCES" || code === "EROFS") {
        console.warn("[cache] Cannot write to cache dir (read-only?). Serving without persisting.");
      } else {
        throw err;
      }
    } finally {
      await fs.unlink(tmpPath).catch(() => {});
    }

    return { meta };
  }
}

// ── KV backend (production / Vercel) ───────────────────────────

class KvCacheBackend implements CacheBackend {
  private async getKv() {
    const { kv } = await import("@vercel/kv");
    return kv;
  }

  async get<T>(key: string): Promise<{ meta: CacheMeta; value: T } | null> {
    try {
      const kvClient = await this.getKv();
      const envelope = await kvClient.get<CacheEnvelope<T>>(key);
      if (!envelope) return null;
      const age = Date.now() - new Date(envelope.meta.cachedAt).getTime();
      if (age > CACHE_TTL_MS) return null;
      return { meta: envelope.meta, value: envelope.payload };
    } catch (err) {
      console.warn("[KvCache] get failed, falling back to null:", err);
      return null;
    }
  }

  async getIgnoreTtl<T>(
    key: string
  ): Promise<{ meta: CacheMeta; value: T } | null> {
    try {
      const kvClient = await this.getKv();
      const envelope = await kvClient.get<CacheEnvelope<T>>(key);
      if (!envelope) return null;
      return { meta: envelope.meta, value: envelope.payload };
    } catch (err) {
      console.warn("[KvCache] getIgnoreTtl failed:", err);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<{ meta: CacheMeta }> {
    const kvClient = await this.getKv();
    const meta: CacheMeta = { cachedAt: new Date().toISOString() };
    const envelope: CacheEnvelope<T> = { meta, payload: value };
    // Expire from KV after 7 days to avoid unbounded growth
    await kvClient.set(key, envelope, { ex: 60 * 60 * 24 * 7 });
    return { meta };
  }
}

// ── Backend factory ────────────────────────────────────────────

let _backend: CacheBackend | null = null;

function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function getCacheBackend(): CacheBackend {
  if (_backend) return _backend;
  if (process.env.NODE_ENV === "production" && isKvConfigured()) {
    console.log("[cache] Using KV backend (production)");
    _backend = new KvCacheBackend();
  } else {
    console.log("[cache] Using disk backend (committed cache)");
    _backend = new DiskCacheBackend();
  }
  return _backend;
}

// ── Public helpers (backward-compatible) ───────────────────────

export async function readCache<T>(
  key: string
): Promise<{ meta: CacheMeta; value: T } | null> {
  return getCacheBackend().get<T>(key);
}

export async function readCacheIgnoreTtl<T>(
  key: string
): Promise<{ meta: CacheMeta; value: T } | null> {
  return getCacheBackend().getIgnoreTtl<T>(key);
}

export async function writeCache<T>(
  key: string,
  value: T
): Promise<{ meta: CacheMeta }> {
  return getCacheBackend().set(key, value);
}

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
