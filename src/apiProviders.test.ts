import { describe, it, expect, vi, beforeEach } from "vitest";
import { withRetry } from "./apiProviders";

describe("withRetry", () => {
  it("returns the result immediately on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, 3, 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on the second attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, 3, 0);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws the last error after exhausting all attempts", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockRejectedValueOnce(new Error("fail 3"));

    await expect(withRetry(fn, 3, 0)).rejects.toThrow("fail 3");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects maxAttempts=1 (no retries)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("immediate fail"));

    await expect(withRetry(fn, 1, 0)).rejects.toThrow("immediate fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry after a successful first call", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    await withRetry(fn, 3, 0);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
