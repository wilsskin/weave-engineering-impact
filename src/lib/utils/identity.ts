/**
 * Identity normalization for GitHub actors.
 * Determines bot status and produces stable engineer keys
 * so all pillars share one consistent identity layer.
 */

import {
  KNOWN_BOT_LOGINS,
  BOT_LOGIN_SUFFIX,
} from "@/lib/config/appConfig";
import type { Actor, EngineerKey } from "@/lib/types";

/** Raw shape we might receive from the GitHub API before normalization. */
interface RawActor {
  login: string;
  id?: number;
  type?: string;
}

/**
 * Returns true if the login belongs to a bot.
 * Checks: explicit `type === "Bot"`, known-bot allow-list, and suffix heuristic.
 */
export function isBotLogin(actor: RawActor): boolean {
  if (actor.type === "Bot") return true;
  const lower = actor.login.toLowerCase();
  if (KNOWN_BOT_LOGINS.has(lower)) return true;
  if (lower.endsWith(`[${BOT_LOGIN_SUFFIX}]`)) return true;
  if (lower.endsWith(BOT_LOGIN_SUFFIX) && lower !== BOT_LOGIN_SUFFIX) return true;
  return false;
}

/**
 * Converts a raw GitHub actor payload into our canonical Actor shape
 * with deterministic bot classification.
 */
export function normalizeActor(raw: RawActor): Actor {
  return {
    login: raw.login,
    id: raw.id ?? 0,
    type: raw.type ?? "User",
    isBot: isBotLogin(raw),
  };
}

/** Stable key for grouping metrics by engineer. */
export function engineerKey(actor: Actor): EngineerKey {
  return { login: actor.login };
}
