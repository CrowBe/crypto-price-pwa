/**
 * Feed Store – IndexedDB wrapper for feed items and metadata.
 *
 * Uses the raw IndexedDB API (no library) to keep the bundle small.
 * All operations are async and return Promises.
 */

import type { FeedItem, SourceConfig, FollowList, FeedSource } from "./types";

const DB_NAME = "feed_aggregator";
const DB_VERSION = 1;

// Store names
const ITEMS = "items";
const CONFIGS = "configs";
const FOLLOWS = "follows";

// ── Singleton DB handle ─────────────────────────────────────────────────────
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // Feed items – indexed for sorting & dedup
      if (!db.objectStoreNames.contains(ITEMS)) {
        const store = db.createObjectStore(ITEMS, { keyPath: "id" });
        store.createIndex("by_publishedAt", "publishedAt");
        store.createIndex("by_source", "source");
        store.createIndex("by_urlHash", "urlHash", { unique: false });
        store.createIndex("by_read", "read");
      }

      // Source configs (one per source)
      if (!db.objectStoreNames.contains(CONFIGS)) {
        db.createObjectStore(CONFIGS, { keyPath: "source" });
      }

      // Follow lists (one per source)
      if (!db.objectStoreNames.contains(FOLLOWS)) {
        db.createObjectStore(FOLLOWS, { keyPath: "source" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function tx(
  storeNames: string | string[],
  mode: IDBTransactionMode = "readonly"
): Promise<IDBTransaction> {
  return openDB().then((db) => db.transaction(storeNames, mode));
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── Feed items ──────────────────────────────────────────────────────────────

/** Insert a feed item if its id doesn't already exist. Returns true if inserted. */
export async function insertItem(item: FeedItem): Promise<boolean> {
  const t = await tx(ITEMS, "readwrite");
  const store = t.objectStore(ITEMS);

  // Check URL-hash dedup: skip if another item shares the same URL
  const existing = await reqToPromise(
    store.index("by_urlHash").getKey(item.urlHash)
  );
  if (existing !== undefined) return false;

  try {
    await reqToPromise(store.add(item));
    return true;
  } catch (e: unknown) {
    // Key already exists (same source:id)
    if (e instanceof DOMException && e.name === "ConstraintError") return false;
    throw e;
  }
}

/** Batch-insert, returning count of actually inserted items. */
export async function insertItems(items: FeedItem[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    if (await insertItem(item)) count++;
  }
  return count;
}

/** Get all feed items sorted by publishedAt descending (newest first). */
export async function getAllItems(limit = 200): Promise<FeedItem[]> {
  const t = await tx(ITEMS);
  const index = t.objectStore(ITEMS).index("by_publishedAt");
  const items: FeedItem[] = [];

  return new Promise((resolve, reject) => {
    const req = index.openCursor(null, "prev"); // newest first
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && items.length < limit) {
        items.push(cursor.value as FeedItem);
        cursor.continue();
      } else {
        resolve(items);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Get items filtered by source. */
export async function getItemsBySource(
  source: FeedSource,
  limit = 200
): Promise<FeedItem[]> {
  const t = await tx(ITEMS);
  const index = t.objectStore(ITEMS).index("by_source");
  const items: FeedItem[] = [];

  return new Promise((resolve, reject) => {
    const req = index.openCursor(IDBKeyRange.only(source), "prev");
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor && items.length < limit) {
        items.push(cursor.value as FeedItem);
        cursor.continue();
      } else {
        resolve(items);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Toggle read state for an item. */
export async function markRead(
  id: string,
  read: boolean = true
): Promise<void> {
  const t = await tx(ITEMS, "readwrite");
  const store = t.objectStore(ITEMS);
  const item: FeedItem | undefined = await reqToPromise(store.get(id));
  if (item) {
    item.read = read;
    await reqToPromise(store.put(item));
  }
}

/** Mark all items as read. */
export async function markAllRead(): Promise<void> {
  const t = await tx(ITEMS, "readwrite");
  const store = t.objectStore(ITEMS);

  return new Promise((resolve, reject) => {
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const item = cursor.value as FeedItem;
        if (!item.read) {
          item.read = true;
          cursor.update(item);
        }
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/** Delete items older than `beforeISO` to keep storage bounded. */
export async function pruneOldItems(beforeISO: string): Promise<number> {
  const t = await tx(ITEMS, "readwrite");
  const index = t.objectStore(ITEMS).index("by_publishedAt");
  let deleted = 0;

  return new Promise((resolve, reject) => {
    const range = IDBKeyRange.upperBound(beforeISO);
    const req = index.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        deleted++;
        cursor.continue();
      } else {
        resolve(deleted);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Source configs ───────────────────────────────────────────────────────────

export async function getSourceConfig(
  source: FeedSource
): Promise<SourceConfig | undefined> {
  const t = await tx(CONFIGS);
  return reqToPromise(t.objectStore(CONFIGS).get(source));
}

export async function getAllSourceConfigs(): Promise<SourceConfig[]> {
  const t = await tx(CONFIGS);
  return reqToPromise(t.objectStore(CONFIGS).getAll());
}

export async function saveSourceConfig(config: SourceConfig): Promise<void> {
  const t = await tx(CONFIGS, "readwrite");
  await reqToPromise(t.objectStore(CONFIGS).put(config));
}

// ── Follow lists ────────────────────────────────────────────────────────────

export async function getFollowList(
  source: FeedSource
): Promise<FollowList | undefined> {
  const t = await tx(FOLLOWS);
  return reqToPromise(t.objectStore(FOLLOWS).get(source));
}

export async function saveFollowList(list: FollowList): Promise<void> {
  const t = await tx(FOLLOWS, "readwrite");
  await reqToPromise(t.objectStore(FOLLOWS).put(list));
}

/** Exposed for testing – close and reset the DB singleton. */
export function _resetDB(): void {
  dbPromise = null;
}
