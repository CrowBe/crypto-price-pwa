/**
 * YouTube Data API v3 client.
 *
 * Handles:
 * - Fetching the user's channel subscriptions (bootstrap)
 * - Fetching recent videos from subscribed channels
 * - Mapping videos → FeedItem format
 *
 * Rate limits:
 *   Quota is 10,000 units/day by default.
 *   - subscriptions.list   → 1 unit per call
 *   - search.list          → 100 units per call (expensive!)
 *   - activities.list      → 1 unit per call (cheaper, but limited fields)
 *
 * Strategy: use activities.list to find new uploads (1 unit each),
 * then optionally hydrate with videos.list (1 unit per 50 videos).
 * This keeps daily quota low even with many subscriptions.
 */

import type { FeedItem, OAuthTokens } from "../types";
import { hashUrl } from "../urlHash";

const API_BASE = "https://www.googleapis.com/youtube/v3";

interface Subscription {
  snippet: {
    resourceId: { channelId: string };
    title: string;
    thumbnails?: { default?: { url: string } };
  };
}

interface Activity {
  snippet: {
    type: string;
    channelId: string;
    channelTitle: string;
    title: string;
    description: string;
    publishedAt: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
  contentDetails: {
    upload?: { videoId: string };
  };
}

// ── Auth helper ─────────────────────────────────────────────────────────────

function headers(tokens: OAuthTokens): HeadersInit {
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

// ── Bootstrap: fetch user's subscriptions ───────────────────────────────────

export async function fetchSubscriptions(
  tokens: OAuthTokens
): Promise<{ channelId: string; title: string }[]> {
  const channels: { channelId: string; title: string }[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      mine: "true",
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(`${API_BASE}/subscriptions?${params}`, {
      headers: headers(tokens),
    });
    if (!res.ok) throw new Error(`YT subscriptions failed: ${res.status}`);

    const body = (await res.json()) as {
      items?: Subscription[];
      nextPageToken?: string;
    };

    if (body.items) {
      channels.push(
        ...body.items.map((s) => ({
          channelId: s.snippet.resourceId.channelId,
          title: s.snippet.title,
        }))
      );
    }
    pageToken = body.nextPageToken;
  } while (pageToken);

  return channels;
}

// ── Fetch recent uploads from a channel ─────────────────────────────────────

export async function fetchChannelUploads(
  tokens: OAuthTokens,
  channelId: string,
  publishedAfter?: string
): Promise<FeedItem[]> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    channelId,
    maxResults: "10",
    ...(publishedAfter ? { publishedAfter } : {}),
  });

  const res = await fetch(`${API_BASE}/activities?${params}`, {
    headers: headers(tokens),
  });
  if (!res.ok) throw new Error(`YT activities failed: ${res.status}`);

  const body = (await res.json()) as { items?: Activity[] };
  if (!body.items) return [];

  return body.items
    .filter((a) => a.snippet.type === "upload" && a.contentDetails.upload)
    .map((a): FeedItem => {
      const videoId = a.contentDetails.upload!.videoId;
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        id: `youtube:${videoId}`,
        source: "youtube",
        sourceId: videoId,
        title: a.snippet.title,
        author: a.snippet.channelTitle,
        url: videoUrl,
        publishedAt: a.snippet.publishedAt,
        imageUrl:
          a.snippet.thumbnails?.medium?.url ??
          a.snippet.thumbnails?.default?.url,
        snippet: a.snippet.description.slice(0, 300),
        read: false,
        urlHash: hashUrl(videoUrl),
        syncedAt: new Date().toISOString(),
      };
    });
}

/**
 * Fetch uploads from multiple channels.
 * Staggers calls to avoid burst quota usage.
 */
export async function fetchAllSubscriptionUploads(
  tokens: OAuthTokens,
  channelIds: string[],
  publishedAfter?: string
): Promise<FeedItem[]> {
  const items: FeedItem[] = [];

  for (const channelId of channelIds) {
    try {
      const channelItems = await fetchChannelUploads(
        tokens,
        channelId,
        publishedAfter
      );
      items.push(...channelItems);
    } catch (err) {
      console.warn(`YT fetch failed for channel ${channelId}:`, err);
      // Continue with other channels
    }
  }

  return items;
}
