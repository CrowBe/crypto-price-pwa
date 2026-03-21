/**
 * Token Manager – handles OAuth token storage, retrieval, and automatic refresh.
 *
 * Tokens are stored inside the SourceConfig in IndexedDB (via feedStore).
 * This module wraps the refresh logic per platform.
 */

import type { FeedSource, OAuthTokens } from "./types";
import { getSourceConfig, saveSourceConfig } from "./feedStore";
import { defaultSourceConfig } from "./sourceDefaults";

/** Buffer before actual expiry to trigger a refresh (5 minutes). */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;

// ── Token getters ───────────────────────────────────────────────────────────

/** Get current tokens for a source, refreshing if expired. */
export async function getValidTokens(
  source: FeedSource
): Promise<OAuthTokens | null> {
  const config = await getSourceConfig(source);
  const tokens = config?.credentials?.oauth;
  if (!tokens) return null;

  // Check if tokens are expired (or about to expire)
  if (tokens.expiresAt && Date.now() > tokens.expiresAt - REFRESH_BUFFER_MS) {
    if (!tokens.refreshToken) return null; // Can't refresh
    return refreshTokens(source, tokens);
  }

  return tokens;
}

// ── Token persistence ───────────────────────────────────────────────────────

/** Save new tokens for a source after an OAuth flow completes. */
export async function saveTokens(
  source: FeedSource,
  tokens: OAuthTokens
): Promise<void> {
  let config = await getSourceConfig(source);
  if (!config) config = defaultSourceConfig(source);

  config.credentials = {
    ...config.credentials,
    oauth: tokens,
  };
  config.enabled = true;
  await saveSourceConfig(config);
}

/** Clear tokens for a source (logout). */
export async function clearTokens(source: FeedSource): Promise<void> {
  const config = await getSourceConfig(source);
  if (!config) return;
  if (config.credentials) {
    delete config.credentials.oauth;
  }
  config.enabled = false;
  await saveSourceConfig(config);
}

// ── Refresh logic ───────────────────────────────────────────────────────────

/**
 * Refresh expired tokens.
 *
 * In a real deployment this would call your backend proxy
 * (to keep client_secret safe). For the MVP we show the flow structure
 * and make it easy to plug in a real endpoint.
 */
async function refreshTokens(
  source: FeedSource,
  current: OAuthTokens
): Promise<OAuthTokens | null> {
  const endpoint = refreshEndpoints[source];
  if (!endpoint) return null;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken, source }),
    });

    if (!res.ok) {
      console.error(`Token refresh failed for ${source}: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
    };

    const refreshed: OAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? current.refreshToken,
      expiresAt: data.expires_in
        ? Date.now() + data.expires_in * 1000
        : undefined,
      tokenType: data.token_type ?? current.tokenType,
      scope: current.scope,
    };

    await saveTokens(source, refreshed);
    return refreshed;
  } catch (err) {
    console.error(`Token refresh error for ${source}:`, err);
    return null;
  }
}

/**
 * Backend proxy endpoints for token refresh.
 * In production, point these at your own server that holds client secrets.
 * The proxy should accept { refreshToken, source } and return standard
 * OAuth2 token-response JSON.
 */
const refreshEndpoints: Partial<Record<FeedSource, string>> = {
  x: "/api/auth/x/refresh",
  youtube: "/api/auth/youtube/refresh",
  // NewsAPI uses static API keys, no refresh needed
};
