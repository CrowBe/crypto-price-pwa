/**
 * Sync Scheduler – orchestrates periodic feed syncing across all sources.
 *
 * Design:
 * - Each source has an independent poll timer based on its pollIntervalMinutes.
 * - Sync is non-blocking: failures on one source don't affect others.
 * - The scheduler tracks per-source status (syncing, lastSync, errors).
 * - Bootstrap (fetching follow lists) runs once per source on first sync.
 */

import type { FeedSource, SyncStatus, FeedItem, FollowList } from "./types";
import {
  getAllSourceConfigs,
  getSourceConfig,
  saveSourceConfig,
  insertItems,
  getFollowList,
  saveFollowList,
} from "./feedStore";
import { getValidTokens } from "./tokenManager";
import {
  getAuthenticatedUserId,
  fetchFollowing,
  fetchTimeline,
} from "./clients/xClient";
import {
  fetchSubscriptions,
  fetchAllSubscriptionUploads,
} from "./clients/youtubeClient";
import { fetchTopHeadlines, getNewsTopics } from "./clients/newsClient";

// ── State ───────────────────────────────────────────────────────────────────

const timers = new Map<FeedSource, ReturnType<typeof setInterval>>();
const statusMap = new Map<FeedSource, SyncStatus>();
let statusListeners: Array<(statuses: SyncStatus[]) => void> = [];

function getStatus(source: FeedSource): SyncStatus {
  if (!statusMap.has(source)) {
    statusMap.set(source, { source, syncing: false });
  }
  return statusMap.get(source)!;
}

function notifyListeners(): void {
  const all = [...statusMap.values()];
  for (const fn of statusListeners) fn(all);
}

/** Subscribe to sync status changes. Returns unsubscribe function. */
export function onSyncStatus(
  fn: (statuses: SyncStatus[]) => void
): () => void {
  statusListeners.push(fn);
  fn([...statusMap.values()]);
  return () => {
    statusListeners = statusListeners.filter((f) => f !== fn);
  };
}

// ── Bootstrap: per-platform follow-list fetch ───────────────────────────────

async function bootstrapFollowList(source: FeedSource): Promise<string[]> {
  const existing = await getFollowList(source);
  // Re-fetch if older than 24 hours or missing
  const stale =
    !existing ||
    Date.now() - new Date(existing.fetchedAt).getTime() > 24 * 60 * 60 * 1000;

  if (!stale && existing) return existing.ids;

  const tokens = await getValidTokens(source);
  if (!tokens) return existing?.ids ?? [];

  let ids: string[] = [];

  switch (source) {
    case "x": {
      const userId = await getAuthenticatedUserId(tokens);
      ids = await fetchFollowing(tokens, userId);
      break;
    }
    case "youtube": {
      const subs = await fetchSubscriptions(tokens);
      ids = subs.map((s) => s.channelId);
      break;
    }
    case "newsapi":
      // No follow list – topics are configured locally
      ids = getNewsTopics();
      break;
  }

  const list: FollowList = {
    source,
    ids,
    fetchedAt: new Date().toISOString(),
  };
  await saveFollowList(list);
  return ids;
}

// ── Per-source sync logic ───────────────────────────────────────────────────

async function syncSource(source: FeedSource): Promise<FeedItem[]> {
  const config = await getSourceConfig(source);
  if (!config?.enabled) return [];

  switch (source) {
    case "x": {
      const tokens = await getValidTokens("x");
      if (!tokens) throw new Error("X: not authenticated");
      const userId = await getAuthenticatedUserId(tokens);
      return fetchTimeline(tokens, userId);
    }

    case "youtube": {
      const tokens = await getValidTokens("youtube");
      if (!tokens) throw new Error("YouTube: not authenticated");
      const channelIds = await bootstrapFollowList("youtube");
      const publishedAfter = config.lastSyncAt;
      return fetchAllSubscriptionUploads(tokens, channelIds, publishedAfter);
    }

    case "newsapi": {
      const apiKey = config.credentials?.apiKey;
      if (!apiKey) throw new Error("NewsAPI: no API key configured");
      const topics = getNewsTopics();
      return fetchTopHeadlines(apiKey, topics);
    }
  }
}

// ── Main sync entry point ───────────────────────────────────────────────────

/** Run a single sync cycle for one source. */
export async function syncOne(source: FeedSource): Promise<number> {
  const status = getStatus(source);
  if (status.syncing) return 0; // Already in progress

  status.syncing = true;
  status.lastError = undefined;
  notifyListeners();

  try {
    // Bootstrap follow list if needed
    await bootstrapFollowList(source);

    // Fetch new items
    const items = await syncSource(source);

    // Insert with dedup (feedStore handles URL-hash dedup)
    const inserted = await insertItems(items);

    // Update lastSyncAt
    const config = await getSourceConfig(source);
    if (config) {
      config.lastSyncAt = new Date().toISOString();
      await saveSourceConfig(config);
    }

    status.lastSyncAt = new Date().toISOString();
    status.syncing = false;
    notifyListeners();

    return inserted;
  } catch (err) {
    status.syncing = false;
    status.lastError =
      err instanceof Error ? err.message : "Unknown sync error";
    notifyListeners();
    console.error(`Sync failed for ${source}:`, err);
    return 0;
  }
}

/** Sync all enabled sources. */
export async function syncAll(): Promise<void> {
  const configs = await getAllSourceConfigs();
  const enabled = configs.filter((c) => c.enabled);

  // Run all sources in parallel
  await Promise.allSettled(enabled.map((c) => syncOne(c.source)));
}

// ── Scheduler lifecycle ─────────────────────────────────────────────────────

/** Start periodic syncing for all enabled sources. */
export async function startScheduler(): Promise<void> {
  stopScheduler(); // Clear any existing timers

  const configs = await getAllSourceConfigs();

  for (const config of configs) {
    if (!config.enabled) continue;

    const intervalMs = config.pollIntervalMinutes * 60 * 1000;

    // Sync immediately on start
    syncOne(config.source);

    // Then schedule recurring syncs
    const timer = setInterval(() => {
      syncOne(config.source);
    }, intervalMs);

    timers.set(config.source, timer);
  }
}

/** Stop all sync timers. */
export function stopScheduler(): void {
  for (const timer of timers.values()) {
    clearInterval(timer);
  }
  timers.clear();
}

/** Restart scheduler (call after config changes). */
export async function restartScheduler(): Promise<void> {
  stopScheduler();
  await startScheduler();
}
