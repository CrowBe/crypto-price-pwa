import { describe, it, expect } from "vitest";
import { hashUrl } from "./urlHash";

describe("hashUrl", () => {
  it("produces the same hash for identical URLs", () => {
    const a = hashUrl("https://example.com/article");
    const b = hashUrl("https://example.com/article");
    expect(a).toBe(b);
  });

  it("strips tracking params (utm_source, fbclid, etc.)", () => {
    const clean = hashUrl("https://example.com/article");
    const tracked = hashUrl(
      "https://example.com/article?utm_source=twitter&utm_medium=social&fbclid=abc123"
    );
    expect(tracked).toBe(clean);
  });

  it("normalises trailing slashes", () => {
    const a = hashUrl("https://example.com/path/");
    const b = hashUrl("https://example.com/path");
    expect(a).toBe(b);
  });

  it("is case-insensitive on host", () => {
    const a = hashUrl("https://EXAMPLE.COM/path");
    const b = hashUrl("https://example.com/path");
    expect(a).toBe(b);
  });

  it("preserves non-tracking query params", () => {
    const a = hashUrl("https://example.com/search?q=test");
    const b = hashUrl("https://example.com/search?q=other");
    expect(a).not.toBe(b);
  });

  it("produces deterministic order for query params", () => {
    const a = hashUrl("https://example.com/path?b=2&a=1");
    const b = hashUrl("https://example.com/path?a=1&b=2");
    expect(a).toBe(b);
  });

  it("handles YouTube video URLs correctly", () => {
    const a = hashUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const b = hashUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&utm_source=twitter"
    );
    expect(a).toBe(b);
  });

  it("handles invalid URLs gracefully", () => {
    const h = hashUrl("not-a-url");
    expect(typeof h).toBe("string");
    expect(h.length).toBeGreaterThan(0);
  });
});
