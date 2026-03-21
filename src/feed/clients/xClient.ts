/**
 * X (Twitter) API v2 client.
 *
 * Handles:
 * - Fetching the authenticated user's following list (bootstrap)
 * - Fetching recent tweets from those users
 * - Mapping tweets → FeedItem format
 *
 * Rate limits (app-level, per 15-min window):
 *   GET /2/users/:id/following       → 15 requests
 *   GET /2/users/:id/tweets          → 1500 requests (per-user: 900)
 *   GET /2/users/:id/timelines/reverse_chronological → 180 requests
 *
 * We use the reverse-chronological timeline endpoint which returns tweets
 * from accounts the user follows – one call instead of N per-user calls.
 */

import type { FeedItem, OAuthTokens } from "../types";
import { hashUrl } from "../urlHash";

const API_BASE = "https://api.x.com/2";

interface XUser {
  id: string;
  name: string;
  username: string;
}

interface XTweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  entities?: {
    urls?: { expanded_url: string; display_url: string }[];
  };
}

interface TimelineResponse {
  data?: XTweet[];
  includes?: { users?: XUser[] };
  meta?: { next_token?: string; result_count?: number };
}

interface FollowingResponse {
  data?: XUser[];
  meta?: { next_token?: string; result_count?: number };
}

// ── Auth helper ─────────────────────────────────────────────────────────────

function headers(tokens: OAuthTokens): HeadersInit {
  return { Authorization: `Bearer ${tokens.accessToken}` };
}

// ── Get authenticated user ID ───────────────────────────────────────────────

export async function getAuthenticatedUserId(
  tokens: OAuthTokens
): Promise<string> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: headers(tokens),
  });
  if (!res.ok) throw new Error(`X /users/me failed: ${res.status}`);
  const data = (await res.json()) as { data: { id: string } };
  return data.data.id;
}

// ── Bootstrap: fetch who the user follows ───────────────────────────────────

export async function fetchFollowing(
  tokens: OAuthTokens,
  userId: string
): Promise<string[]> {
  const ids: string[] = [];
  let nextToken: string | undefined;

  do {
    const params = new URLSearchParams({
      max_results: "1000",
      ...(nextToken ? { pagination_token: nextToken } : {}),
    });

    const res = await fetch(
      `${API_BASE}/users/${userId}/following?${params}`,
      { headers: headers(tokens) }
    );
    if (!res.ok) throw new Error(`X /following failed: ${res.status}`);

    const body = (await res.json()) as FollowingResponse;
    if (body.data) ids.push(...body.data.map((u) => u.id));
    nextToken = body.meta?.next_token;
  } while (nextToken);

  return ids;
}

// ── Fetch home timeline (tweets from followed accounts) ─────────────────────

export async function fetchTimeline(
  tokens: OAuthTokens,
  userId: string,
  sinceId?: string
): Promise<FeedItem[]> {
  const params = new URLSearchParams({
    max_results: "100",
    "tweet.fields": "created_at,author_id,entities",
    expansions: "author_id",
    "user.fields": "name,username",
    ...(sinceId ? { since_id: sinceId } : {}),
  });

  const res = await fetch(
    `${API_BASE}/users/${userId}/timelines/reverse_chronological?${params}`,
    { headers: headers(tokens) }
  );

  if (!res.ok) throw new Error(`X timeline failed: ${res.status}`);

  const body = (await res.json()) as TimelineResponse;
  if (!body.data) return [];

  // Build author lookup
  const authors = new Map<string, XUser>();
  for (const u of body.includes?.users ?? []) {
    authors.set(u.id, u);
  }

  return body.data.map((tweet): FeedItem => {
    const author = authors.get(tweet.author_id);
    const tweetUrl = `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`;

    return {
      id: `x:${tweet.id}`,
      source: "x",
      sourceId: tweet.id,
      title: tweet.text.slice(0, 120),
      author: author ? `@${author.username}` : tweet.author_id,
      url: tweetUrl,
      publishedAt: tweet.created_at,
      snippet: tweet.text,
      read: false,
      urlHash: hashUrl(tweetUrl),
      syncedAt: new Date().toISOString(),
    };
  });
}
