import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createElement } from "react";
import useStatus from "./useStatus";

describe("useStatus", () => {
  it("initialises with the provided state", () => {
    const { result } = renderHook(() => useStatus("loading"));
    // Status component and setStatus setter should be returned
    expect(typeof result.current.Status).toBe("function");
    expect(typeof result.current.setStatus).toBe("function");
  });

  it("Status renders the element matching the current state", () => {
    const { result } = renderHook(() => useStatus("loading"));
    const { Status } = result.current;

    const loadingEl = createElement("p", {}, "Loading...");
    const successEl = createElement("p", {}, "Done!");
    const errorEl = createElement("p", {}, "Error!");
    const emptyEl = createElement("p", {}, "Empty");

    const rendered = Status({
      loading: loadingEl,
      success: successEl,
      error: errorEl,
      empty: emptyEl,
    });

    expect(rendered).toBe(loadingEl);
  });

  it("Status renders the element for the updated state", () => {
    const { result } = renderHook(() => useStatus("loading"));

    act(() => {
      result.current.setStatus("success");
    });

    const { Status } = result.current;

    const loadingEl = createElement("p", {}, "Loading...");
    const successEl = createElement("p", {}, "Done!");
    const errorEl = createElement("p", {}, "Error!");
    const emptyEl = createElement("p", {}, "Empty");

    const rendered = Status({
      loading: loadingEl,
      success: successEl,
      error: errorEl,
      empty: emptyEl,
    });

    expect(rendered).toBe(successEl);
  });

  it("supports all four loading states", () => {
    const states = ["loading", "success", "error", "empty"] as const;

    states.forEach((state) => {
      const { result } = renderHook(() => useStatus(state));
      expect(typeof result.current.Status).toBe("function");
    });
  });
});
