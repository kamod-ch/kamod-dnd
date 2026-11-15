import { describe, expect, it } from "vitest";
import { indexAfterRemoval } from "../src/sortable/move-helpers.js";
import { indexEdgeFromPhysical, physicalEdge, readDirection } from "../src/sortable/orientation.js";

describe("orientation helpers", () => {
  it("maps horizontal LTR left to before (top index edge)", () => {
    expect(physicalEdge("horizontal", "ltr", "before")).toBe("left");
    expect(indexEdgeFromPhysical("horizontal", "ltr", "left")).toBe("top");
    expect(indexEdgeFromPhysical("horizontal", "ltr", "right")).toBe("bottom");
  });

  it("maps horizontal RTL right to before", () => {
    expect(physicalEdge("horizontal", "rtl", "before")).toBe("right");
    expect(indexEdgeFromPhysical("horizontal", "rtl", "right")).toBe("top");
    expect(indexEdgeFromPhysical("horizontal", "rtl", "left")).toBe("bottom");
  });

  it("reads RTL from computed style when dir attribute is absent", () => {
    const el = document.createElement("div");
    el.style.direction = "rtl";
    expect(readDirection(el)).toBe("rtl");
  });

  it("commits horizontal LTR order without reversing ids", () => {
    const ids = ["a", "b", "c"];
    const index = indexAfterRemoval(ids, ids, "a", "c", "bottom", true);
    expect(index).toBe(2);
  });
});
