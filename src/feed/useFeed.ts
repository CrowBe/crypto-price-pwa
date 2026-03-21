/**
 * React hook for the unified feed.
 *
 * Provides: feed items, sync status, and actions (refresh, mark read, filter).
 */

import { useState, useEffect, useCallback } from "react";
import type { FeedItem, FeedSource, SyncStatus } from "./types";
import { getAllItems, getItemsBySource, markRead, markAllRead } from "./feedStore";
import { syncAll, syncOne, onSyncStatus, startScheduler, stopScheduler } from "./syncScheduler";

export interface UseFeedResult {
  items: FeedItem[];
  loading: boolean;
  syncStatuses: SyncStatus[];
  /** Reload items from IndexedDB. */
  reload: () => Promise<void>;
  /** Trigger an immediate sync of all sources. */
  refreshAll: () => Promise<void>;
  /** Trigger an immediate sync of a single source. */
  refreshSource: (source: FeedSource) => Promise<void>;
  /** Toggle read state on an item. */
  toggleRead: (id: string, read?: boolean) => Promise<void>;
  /** Mark all items as read. */
  readAll: () => Promise<void>;
  /** Current source filter (null = all). */
  filter: FeedSource | null;
  setFilter: (f: FeedSource | null) => void;
}

export function useFeed(): UseFeedResult {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [filter, setFilter] = useState<FeedSource | null>(null);

  // Load items from IndexedDB
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = filter
        ? await getItemsBySource(filter)
        : await getAllItems();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Initial load + scheduler start
  useEffect(() => {
    reload();
    startScheduler();
    return () => stopScheduler();
  }, [reload]);

  // Subscribe to sync status changes and reload when sync finishes
  useEffect(() => {
    let prevSyncing = new Set<FeedSource>();

    const unsub = onSyncStatus((statuses) => {
      setSyncStatuses([...statuses]);

      // Detect when any source finishes syncing → reload
      const nowSyncing = new Set(
        statuses.filter((s) => s.syncing).map((s) => s.source)
      );
      const justFinished = [...prevSyncing].some((s) => !nowSyncing.has(s));
      prevSyncing = nowSyncing;
      if (justFinished) reload();
    });

    return unsub;
  }, [reload]);

  const refreshAll = useCallback(async () => {
    await syncAll();
    await reload();
  }, [reload]);

  const refreshSource = useCallback(
    async (source: FeedSource) => {
      await syncOne(source);
      await reload();
    },
    [reload]
  );

  const toggleRead = useCallback(
    async (id: string, read?: boolean) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        await markRead(id, read ?? !item.read);
        await reload();
      }
    },
    [items, reload]
  );

  const readAll = useCallback(async () => {
    await markAllRead();
    await reload();
  }, [reload]);

  return {
    items,
    loading,
    syncStatuses,
    reload,
    refreshAll,
    refreshSource,
    toggleRead,
    readAll,
    filter,
    setFilter,
  };
}
