import { describe, expect, it } from "vitest";
import { indexAfterRemoval, reorderIds, transferId } from "../src/sortable/move-helpers.js";

describe("move-helpers", () => {
  it("reorders within a list", () => {
    const next = reorderIds(["a", "b", "c"], "a", "c", "bottom");
    expect(next).toEqual(["b", "c", "a"]);
  });

  it("transfers to another container at index", () => {
    const { source, target } = transferId(["a", "b"], ["x"], "b", 1);
    expect(source).toEqual(["a"]);
    expect(target).toEqual(["x", "b"]);
  });

  it("computes target index after removal in same container", () => {
    const idx = indexAfterRemoval(["a", "b", "c"], ["a", "b", "c"], "a", "c", "top", true);
    expect(idx).toBe(1);
  });
});
