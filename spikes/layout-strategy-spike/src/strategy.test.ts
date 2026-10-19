import { describe, expect, it } from "vitest";
import {
  cellsBelow,
  gridIndexNeighbors,
  indexForLogicalEdge,
  logicalEdgeFromPhysical,
  physicalEdge,
  projectPointer,
} from "./strategy.js";

describe("list orientation", () => {
  const ids = ["a", "b", "c"];

  it("keeps vertical before/after on the top and bottom edges", () => {
    expect(physicalEdge("vertical", "ltr", "before")).toBe("top");
    expect(physicalEdge("vertical", "rtl", "after")).toBe("bottom");
    expect(indexForLogicalEdge(ids, "a", "c", "before", true)).toBe(1);
  });

  it("maps horizontal LTR left to before and right to after", () => {
    expect(physicalEdge("horizontal", "ltr", "before")).toBe("left");
    expect(physicalEdge("horizontal", "ltr", "after")).toBe("right");
    expect(logicalEdgeFromPhysical("horizontal", "ltr", "left")).toBe("before");
  });

  it("maps horizontal RTL right to before without reversing the ids", () => {
    expect(physicalEdge("horizontal", "rtl", "before")).toBe("right");
    expect(physicalEdge("horizontal", "rtl", "after")).toBe("left");
    expect(logicalEdgeFromPhysical("horizontal", "rtl", "left")).toBe("after");
    expect(indexForLogicalEdge(ids, "c", "a", "before", true)).toBe(0);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("ignores the cross-axis edge", () => {
    expect(logicalEdgeFromPhysical("horizontal", "ltr", "top")).toBeNull();
    expect(logicalEdgeFromPhysical("vertical", "ltr", "left")).toBeNull();
  });
});

describe("grid neighbors", () => {
  const cells = [
    { id: "a", column: 0, row: 0 },
    { id: "b", column: 1, row: 0 },
    { id: "c", column: 0, row: 1 },
    { id: "d", column: 1, row: 1 },
  ];

  it("disagrees between the next index and the cell below", () => {
    expect(gridIndexNeighbors(cells, "b")).toEqual({ after: "c", below: "d" });
  });

  it("finds two cells below a span", () => {
    const spanned = [
      { id: "wide", column: 0, row: 0, colSpan: 2 },
      { id: "left", column: 0, row: 1 },
      { id: "right", column: 1, row: 1 },
    ];
    expect(cellsBelow(spanned, "wide")).toEqual(["left", "right"]);
    expect(gridIndexNeighbors(spanned, "wide").after).toBe("left");
  });
});

describe("pointer projection", () => {
  const rects = {
    a: { left: 0, top: 0, right: 100, bottom: 40 },
    b: { left: 100, top: 0, right: 200, bottom: 40 },
    c: { left: 200, top: 0, right: 300, bottom: 40 },
  };

  it("treats the right half as after in horizontal LTR", () => {
    const projected = projectPointer({
      ids: ["a", "b", "c"],
      rects,
      point: { x: 260, y: 20 },
      axis: "horizontal",
      direction: "ltr",
      activeId: "a",
      sameContainer: true,
    });
    expect(projected).toMatchObject({ overId: "c", logical: "after" });
  });

  it("treats the right half as before in horizontal RTL", () => {
    const projected = projectPointer({
      ids: ["a", "b", "c"],
      rects,
      point: { x: 260, y: 20 },
      axis: "horizontal",
      direction: "rtl",
      activeId: "b",
      sameContainer: true,
    });
    expect(projected).toMatchObject({ overId: "c", logical: "before" });
  });
});
