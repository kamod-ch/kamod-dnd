import { describe, expect, it } from "vitest";
import { applyMoveIntentToIds } from "../src/sortable/apply-move.js";
import {
  buildMoveIntent,
  indexAfterRemoval,
  reorderIds,
  transferId,
} from "../src/sortable/move-helpers.js";

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

describe("applyMoveIntentToIds", () => {
  it("reorders inside one container without mutating the input", () => {
    const containers = { list: ["a", "b", "c"] };
    const next = applyMoveIntentToIds(
      containers,
      buildMoveIntent({
        itemId: "a",
        sourceContainerId: "list",
        targetContainerId: "list",
        targetIndex: 2,
        data: {},
      }),
    );
    expect(next.list).toEqual(["b", "c", "a"]);
    expect(containers.list).toEqual(["a", "b", "c"]);
  });

  it("transfers an item into another container", () => {
    const containers = { left: ["a", "b"], right: ["c"] };
    const next = applyMoveIntentToIds(
      containers,
      buildMoveIntent({
        itemId: "b",
        sourceContainerId: "left",
        targetContainerId: "right",
        targetIndex: 0,
        data: {},
      }),
    );
    expect(next.left).toEqual(["a"]);
    expect(next.right).toEqual(["b", "c"]);
    expect(containers.left).toEqual(["a", "b"]);
    expect(containers.right).toEqual(["c"]);
  });

  it("leaves contents unchanged when the source item is missing", () => {
    const containers = { list: ["a", "b"] };
    const next = applyMoveIntentToIds(
      containers,
      buildMoveIntent({
        itemId: "missing",
        sourceContainerId: "list",
        targetContainerId: "list",
        targetIndex: 0,
        data: {},
      }),
    );
    expect(next).toBe(containers);
  });

  it("clamps negative and oversized target indexes", () => {
    const containers = { list: ["a", "b", "c"] };
    const negative = applyMoveIntentToIds(
      containers,
      buildMoveIntent({
        itemId: "c",
        sourceContainerId: "list",
        targetContainerId: "list",
        targetIndex: -5,
        data: {},
      }),
    );
    expect(negative.list).toEqual(["c", "a", "b"]);
    const oversized = applyMoveIntentToIds(
      containers,
      buildMoveIntent({
        itemId: "a",
        sourceContainerId: "list",
        targetContainerId: "list",
        targetIndex: 99,
        data: {},
      }),
    );
    expect(oversized.list).toEqual(["b", "c", "a"]);
  });
});
