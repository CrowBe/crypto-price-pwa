/**
 * Feed store tests.
 *
 * Uses fake-indexeddb to run IndexedDB in Node/jsdom.
 * Install: npm install -D fake-indexeddb
 */

import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  insertItem,
  insertItems,
  getAllItems,
  markRead,
  markAllRead,
  pruneOldItems,
  _resetDB,
} from "./feedStore";
import type { FeedItem } from "./types";

function makeFeedItem(overrides: Partial<FeedItem> = {}): FeedItem {
  const id = overrides.id ?? `test:${Math.random().toString(36).slice(2)}`;
  return {
    id,
    source: "newsapi",
    sourceId: id,
    title: "Test article",
    author: "Author",
    url: `https://example.com/${id}`,
    publishedAt: new Date().toISOString(),
    read: false,
    urlHash: `hash_${id}`,
    syncedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  // Reset DB between tests so IndexedDB is fresh
  _resetDB();
  // Clear fake-indexeddb databases
  indexedDB = new IDBFactory();
});

describe("feedStore", () => {
  it("inserts and retrieves a feed item", async () => {
    const item = makeFeedItem({ id: "test:1", publishedAt: "2025-01-01T00:00:00Z" });
    const inserted = await insertItem(item);
    expect(inserted).toBe(true);

    const all = await getAllItems();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("test:1");
  });

  it("deduplicates by id (same source:sourceId)", async () => {
    const item = makeFeedItem({ id: "test:dup", urlHash: "unique1" });
    await insertItem(item);
    const second = await insertItem({ ...item, urlHash: "unique2" });
    expect(second).toBe(false);

    const all = await getAllItems();
    expect(all).toHaveLength(1);
  });

  it("deduplicates by urlHash (cross-source)", async () => {
    const item1 = makeFeedItem({ id: "x:1", urlHash: "shared_hash" });
    const item2 = makeFeedItem({ id: "youtube:1", urlHash: "shared_hash" });

    await insertItem(item1);
    const inserted = await insertItem(item2);
    expect(inserted).toBe(false);
  });

  it("batch inserts and returns count of new items", async () => {
    const items = [
      makeFeedItem({ id: "test:a", urlHash: "a" }),
      makeFeedItem({ id: "test:b", urlHash: "b" }),
      makeFeedItem({ id: "test:c", urlHash: "b" }), // dup URL hash
    ];

    const count = await insertItems(items);
    expect(count).toBe(2);
  });

  it("returns items sorted by publishedAt descending", async () => {
    await insertItem(makeFeedItem({ id: "test:old", urlHash: "h1", publishedAt: "2025-01-01T00:00:00Z" }));
    await insertItem(makeFeedItem({ id: "test:new", urlHash: "h2", publishedAt: "2025-06-01T00:00:00Z" }));
    await insertItem(makeFeedItem({ id: "test:mid", urlHash: "h3", publishedAt: "2025-03-01T00:00:00Z" }));

    const all = await getAllItems();
    expect(all.map((i) => i.id)).toEqual(["test:new", "test:mid", "test:old"]);
  });

  it("toggles read state", async () => {
    await insertItem(makeFeedItem({ id: "test:r1", urlHash: "r1" }));

    await markRead("test:r1", true);
    let all = await getAllItems();
    expect(all[0].read).toBe(true);

    await markRead("test:r1", false);
    all = await getAllItems();
    expect(all[0].read).toBe(false);
  });

  it("marks all items as read", async () => {
    await insertItem(makeFeedItem({ id: "test:m1", urlHash: "m1" }));
    await insertItem(makeFeedItem({ id: "test:m2", urlHash: "m2" }));

    await markAllRead();
    const all = await getAllItems();
    expect(all.every((i) => i.read)).toBe(true);
  });

  it("prunes items older than a given date", async () => {
    await insertItem(makeFeedItem({ id: "test:old", urlHash: "p1", publishedAt: "2024-01-01T00:00:00Z" }));
    await insertItem(makeFeedItem({ id: "test:new", urlHash: "p2", publishedAt: "2025-06-01T00:00:00Z" }));

    const deleted = await pruneOldItems("2025-01-01T00:00:00Z");
    expect(deleted).toBe(1);

    const all = await getAllItems();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("test:new");
  });
});
