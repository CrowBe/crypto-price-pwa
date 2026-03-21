/**
 * Feed Aggregator – shared types
 *
 * Covers: feed items, source configs, token storage, and sync metadata.
 */

// ── Feed sources ────────────────────────────────────────────────────────────
export type FeedSource = "x" | "youtube" | "newsapi";

// ── Unified feed item stored in IndexedDB ───────────────────────────────────
export interface FeedItem {
  /** Deterministic ID: `${source}:${sourceId}` */
  id: string;
  source: FeedSource;
  /** Platform-specific ID (tweet ID, video ID, article URL hash) */
  sourceId: string;
  title: string;
  /** Author / channel / handle */
  author: string;
  /** Canonical URL to the content */
  url: string;
  /** ISO-8601 publication timestamp */
  publishedAt: string;
  /** Optional thumbnail / preview image URL */
  imageUrl?: string;
  /** Short text preview (tweet body, video description snippet, article desc) */
  snippet?: string;
  /** Read / unread state – unread by default */
  read: boolean;
  /** URL fingerprint used for cross-source deduplication */
  urlHash: string;
  /** ISO-8601 timestamp when the item was inserted locally */
  syncedAt: string;
}

// ── OAuth token envelope ────────────────────────────────────────────────────
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  /** Unix-ms expiry; undefined = never expires */
  expiresAt?: number;
  tokenType?: string;
  scope?: string;
}

// ── Per-source configuration ────────────────────────────────────────────────
export interface SourceConfig {
  source: FeedSource;
  enabled: boolean;
  /** Polling interval in minutes (default 15) */
  pollIntervalMinutes: number;
  /** ISO-8601 timestamp of last successful sync */
  lastSyncAt?: string;
  /** API key (NewsAPI) or OAuth tokens (X, YouTube) */
  credentials?: {
    apiKey?: string;
    oauth?: OAuthTokens;
  };
}

// ── Sync status exposed to the UI ───────────────────────────────────────────
export interface SyncStatus {
  source: FeedSource;
  syncing: boolean;
  lastSyncAt?: string;
  lastError?: string;
}

// ── Bootstrap: per-platform "who do I follow?" ─────────────────────────────
export interface FollowList {
  source: FeedSource;
  /** Platform IDs of accounts / channels the user follows */
  ids: string[];
  /** When we last fetched this list */
  fetchedAt: string;
}
