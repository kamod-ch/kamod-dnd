import type { MoveIntent } from "@kamod-ch/dnd";
import { describe, expect, it } from "vitest";
import {
  applyTreeMove,
  createFixtureTree,
  DEFAULT_ROOT_CONTAINER_ID,
  parentOf,
  projectKeyboardMove,
  type TreeState,
} from "../src/tree/index.js";

function cloneTree(state: TreeState): TreeState {
  return JSON.parse(JSON.stringify(state)) as TreeState;
}

function move(
  state: TreeState,
  partial: Pick<MoveIntent, "itemId" | "sourceContainerId" | "targetContainerId" | "targetIndex">,
): TreeState {
  const node = state.nodes[partial.itemId];
  if (!node) throw new Error("missing node");
  const intent: MoveIntent = { kind: "move", ...partial, data: node };
  const result = applyTreeMove(state, intent);
  if (!result.ok) throw new Error(result.reason);
  return result.state;
}

describe("tree helpers", () => {
  it("reorders siblings within the root container", () => {
    const next = move(createFixtureTree(), {
      itemId: "rB",
      sourceContainerId: DEFAULT_ROOT_CONTAINER_ID,
      targetContainerId: DEFAULT_ROOT_CONTAINER_ID,
      targetIndex: 0,
    });
    expect(next.rootIds).toEqual(["rB", "rA"]);
  });

  it("transfers from root to an empty child list", () => {
    const next = move(createFixtureTree(), {
      itemId: "g1",
      sourceContainerId: "c1",
      targetContainerId: "rB",
      targetIndex: 0,
    });
    expect(next.nodes.rB?.childIds).toEqual(["g1"]);
    expect(next.nodes.c1?.childIds).toEqual([]);
  });

  it("transfers from child back to root with after-removal index", () => {
    const start = createFixtureTree();
    const next = move(start, {
      itemId: "c1",
      sourceContainerId: "rA",
      targetContainerId: DEFAULT_ROOT_CONTAINER_ID,
      targetIndex: 2,
    });
    expect(next.rootIds).toEqual(["rA", "rB", "c1"]);
    expect(next.nodes.rA?.childIds).toEqual(["c2"]);
  });

  it("preserves subtree when moving a parent node", () => {
    const next = move(createFixtureTree(), {
      itemId: "rA",
      sourceContainerId: DEFAULT_ROOT_CONTAINER_ID,
      targetContainerId: DEFAULT_ROOT_CONTAINER_ID,
      targetIndex: 1,
    });
    expect(next.rootIds).toEqual(["rB", "rA"]);
    expect(next.nodes.rA?.childIds).toEqual(["c1", "c2"]);
    expect(next.nodes.c1?.childIds).toEqual(["g1"]);
  });

  it("rejects moving a node into itself or a descendant", () => {
    const start = cloneTree(createFixtureTree());
    const intent: MoveIntent = {
      kind: "move",
      itemId: "rA",
      sourceContainerId: DEFAULT_ROOT_CONTAINER_ID,
      targetContainerId: "c1",
      targetIndex: 0,
      data: start.nodes.rA!,
    };
    const result = applyTreeMove(start, intent);
    expect(result.ok).toBe(false);
    expect(start).toEqual(createFixtureTree());
  });

  it("rejects unknown item, source mismatch, and unknown target without mutation", () => {
    const start = cloneTree(createFixtureTree());
    expect(
      applyTreeMove(start, {
        kind: "move",
        itemId: "missing",
        sourceContainerId: DEFAULT_ROOT_CONTAINER_ID,
        targetContainerId: DEFAULT_ROOT_CONTAINER_ID,
        targetIndex: 0,
        data: { id: "missing", label: "x", childIds: [] },
      }).ok,
    ).toBe(false);

    expect(
      applyTreeMove(start, {
        kind: "move",
        itemId: "c1",
        sourceContainerId: DEFAULT_ROOT_CONTAINER_ID,
        targetContainerId: "c2",
        targetIndex: 0,
        data: start.nodes.c1!,
      }).ok,
    ).toBe(false);

    expect(
      applyTreeMove(start, {
        kind: "move",
        itemId: "c2",
        sourceContainerId: "rA",
        targetContainerId: "nope",
        targetIndex: 0,
        data: start.nodes.c2!,
      }).ok,
    ).toBe(false);
    expect(start).toEqual(createFixtureTree());
  });

  it("projects indent under the previous sibling and outdent after the parent", () => {
    const start = createFixtureTree();
    const indent = projectKeyboardMove(start, "c2", { type: "indent" });
    expect(indent?.targetContainerId).toBe("c1");

    const underC1 = applyTreeMove(start, indent!);
    if (!underC1.ok) throw new Error("expected indent to succeed");
    expect(parentOf(underC1.state, "c2")).toBe("c1");

    const outdent = projectKeyboardMove(underC1.state, "c2", { type: "outdent" });
    const restored = applyTreeMove(underC1.state, outdent!);
    if (!restored.ok) throw new Error("expected outdent to succeed");
    expect(restored.state.nodes.rA?.childIds).toEqual(["c1", "c2"]);
  });

  it("returns null for boundary-invalid indent and outdent", () => {
    const start = createFixtureTree();
    expect(projectKeyboardMove(start, "c1", { type: "indent" })).toBeNull();
    expect(projectKeyboardMove(start, "rA", { type: "outdent" })).toBeNull();
  });

  it("uses target index after source removal within the same container", () => {
    const next = move(createFixtureTree(), {
      itemId: "c1",
      sourceContainerId: "rA",
      targetContainerId: "rA",
      targetIndex: 1,
    });
    expect(next.nodes.rA?.childIds).toEqual(["c2", "c1"]);
  });
});
