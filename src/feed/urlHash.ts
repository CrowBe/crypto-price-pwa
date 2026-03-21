/**
 * Simple URL fingerprint for deduplication.
 *
 * Strips tracking params (utm_*, ref, etc.), normalises the URL,
 * and produces a short hash string. Two feed items pointing at the
 * same canonical URL will share the same hash, enabling cross-source dedup.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "fbclid",
  "gclid",
  "s",       // X (Twitter) share tracking param
  "t",       // YouTube timestamp (debatable – keeping as not dedup-relevant)
]);

/** Normalise and strip a URL for hashing. */
function canonicalise(raw: string): string {
  try {
    const url = new URL(raw);

    // Remove tracking query params
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key)) url.searchParams.delete(key);
    }

    // Sort remaining params for determinism
    url.searchParams.sort();

    // Drop trailing slash, lowercase host
    let out = url.origin.toLowerCase() + url.pathname.replace(/\/+$/, "");
    const qs = url.searchParams.toString();
    if (qs) out += "?" + qs;
    return out;
  } catch {
    return raw.toLowerCase().trim();
  }
}

/**
 * DJB2-style hash → hex string.  Not cryptographic, just fast & deterministic.
 */
function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/** Produce a dedup hash for a URL. */
export function hashUrl(url: string): string {
  return djb2(canonicalise(url));
}
