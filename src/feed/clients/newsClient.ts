/**
 * NewsAPI client.
 *
 * Handles:
 * - Fetching top headlines or everything for configured topics
 * - Mapping articles → FeedItem format
 *
 * Rate limits (free plan):
 *   - 100 requests / day (!)
 *   - Max 100 results per request
 *
 * Strategy: use /v2/top-headlines with curated topics. With a 15-min
 * poll interval that's 96 calls/day – tight but workable on free tier.
 * Combine multiple topics into fewer calls using the `q` param.
 */

import type { FeedItem } from "../types";
import { hashUrl } from "../urlHash";

const API_BASE = "https://newsapi.org/v2";

interface NewsArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

// ── Default topics ──────────────────────────────────────────────────────────

const DEFAULT_TOPICS = ["technology", "crypto", "AI"];

// ── Fetch headlines ─────────────────────────────────────────────────────────

export async function fetchTopHeadlines(
  apiKey: string,
  topics: string[] = DEFAULT_TOPICS,
  pageSize = 30
): Promise<FeedItem[]> {
  // Combine topics into one query to save API calls
  const q = topics.join(" OR ");

  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    sortBy: "publishedAt",
    language: "en",
    apiKey,
  });

  const res = await fetch(`${API_BASE}/everything?${params}`);
  if (!res.ok) throw new Error(`NewsAPI failed: ${res.status}`);

  const body = (await res.json()) as NewsResponse;
  if (body.status !== "ok") throw new Error(`NewsAPI status: ${body.status}`);

  return body.articles
    .filter((a) => a.title && a.title !== "[Removed]")
    .map((a): FeedItem => {
      return {
        id: `newsapi:${hashUrl(a.url)}`,
        source: "newsapi",
        sourceId: hashUrl(a.url),
        title: a.title,
        author: a.author ?? a.source.name,
        url: a.url,
        publishedAt: a.publishedAt,
        imageUrl: a.urlToImage ?? undefined,
        snippet: a.description ?? undefined,
        read: false,
        urlHash: hashUrl(a.url),
        syncedAt: new Date().toISOString(),
      };
    });
}

/**
 * NewsAPI doesn't have a "follow" concept.
 * Topics are configured statically. This is a no-op bootstrap.
 */
export function getNewsTopics(): string[] {
  const stored = localStorage.getItem("feed_news_topics");
  if (stored) {
    try {
      return JSON.parse(stored) as string[];
    } catch {
      // fall through
    }
  }
  return DEFAULT_TOPICS;
}

export function setNewsTopics(topics: string[]): void {
  localStorage.setItem("feed_news_topics", JSON.stringify(topics));
}
