import { describe, expect, it } from "vitest";
import {
  indexAtOffset,
  isMounted,
  libraryIndexForContainerHit,
  offsetForIndex,
  rowHeight,
  unmountedDropGap,
} from "./geometry.js";

describe("virtual window geometry", () => {
  it("keeps row heights inside the 30–80px band", () => {
    for (let index = 0; index < 200; index += 1) {
      const height = rowHeight(index);
      expect(height).toBeGreaterThanOrEqual(30);
      expect(height).toBeLessThanOrEqual(80);
    }
  });

  it("maps an offset back to the row that contains it", () => {
    const index = 40;
    const offset = offsetForIndex(index) + 4;
    expect(indexAtOffset(10_000, offset)).toBe(index);
  });

  it("appends when the destination row is not a mounted drop target", () => {
    const ids = Array.from({ length: 10_000 }, (_, index) => `row-${index}`);
    const gap = unmountedDropGap({
      ids,
      activeId: "row-0",
      pointerOffset: offsetForIndex(500),
      mounted: { start: 0, end: 24 },
    });
    expect(gap.visualIndex).toBe(500);
    expect(gap.destinationMounted).toBe(false);
    expect(isMounted(500, { start: 0, end: 24 })).toBe(false);
    expect(gap.libraryIndex).toBe(libraryIndexForContainerHit(ids, "row-0"));
    expect(gap.libraryIndex).toBe(ids.length);
    expect(gap.libraryIndex).not.toBe(gap.visualIndex);
  });
});
