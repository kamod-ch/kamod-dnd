import { applyMoveIntentToIds, buildMoveIntent, type MoveIntent } from "@kamod-ch/dnd";
import { describe, expect, it } from "vitest";
import {
  applyBatch,
  batchIndexFromSingle,
  commitBatch,
  sameOrders,
  stableMembers,
  type BatchMember,
} from "./batch.js";

const containers = {
  todo: ["a", "b", "c", "d"],
  doing: ["e"],
  done: [] as string[],
};

function member(id: string, containerId: string): BatchMember<{ id: string }> {
  return { id, containerId, data: { id } };
}

describe("stable selection order", () => {
  it("keeps container order and the order inside each container", () => {
    const members = stableMembers(
      ["todo", "doing", "done"],
      containers,
      new Set(["c", "a", "e"]),
      (id) => ({ id }),
    );
    expect(members.map((item) => item.id)).toEqual(["a", "c", "e"]);
  });
});

describe("batch index", () => {
  it("counts only ids that remain when the group leaves a container", () => {
    const index = batchIndexFromSingle({
      targetIds: ["a", "b", "c", "d"],
      activeId: "a",
      selected: new Set(["a", "c"]),
      singleTargetIndex: 3,
      sameContainer: true,
    });
    expect(index).toBe(2);
    expect(
      applyBatch(containers, [member("a", "todo"), member("c", "todo")], "todo", index),
    ).toMatchObject({ todo: ["b", "d", "a", "c"] });
  });

  it("removes a selected id that already sits in the destination", () => {
    const index = batchIndexFromSingle({
      targetIds: ["e", "c"],
      activeId: "a",
      selected: new Set(["a", "c"]),
      singleTargetIndex: 2,
      sameContainer: false,
    });
    expect(index).toBe(1);
    const next = applyBatch(
      { todo: ["a", "b"], doing: ["e", "c"], done: [] },
      [member("a", "todo"), member("c", "doing")],
      "doing",
      index,
    );
    expect(next).toEqual({ todo: ["b"], doing: ["e", "a", "c"], done: [] });
  });
});

describe("atomic commit", () => {
  it("rejects the whole batch when one member is blocked", () => {
    const snapshot = structuredClone(containers);
    const committed = commitBatch(
      containers,
      [member("a", "todo"), member("d", "todo")],
      "done",
      0,
      (item) => item.id !== "d",
    );
    expect(committed).toBeNull();
    expect(containers).toEqual(snapshot);
  });

  it("moves every member or none, including across containers", () => {
    const committed = commitBatch(
      containers,
      [member("a", "todo"), member("e", "doing")],
      "done",
      0,
      () => true,
    );
    expect(committed?.intent.kind).toBe("batch");
    expect(committed?.intent.itemIds).toEqual(["a", "e"]);
    expect(committed?.orders).toEqual({
      todo: ["b", "c", "d"],
      doing: [],
      done: ["a", "e"],
    });
  });

  it("leaves a replayed single intent applied when a later intent is rejected", () => {
    const first = applyMoveIntentToIds(
      containers,
      buildMoveIntent({
        itemId: "a",
        sourceContainerId: "todo",
        targetContainerId: "done",
        targetIndex: 0,
        data: { id: "a" },
      }),
    );
    expect(first).toEqual({ todo: ["b", "c", "d"], doing: ["e"], done: ["a"] });
    const blocked = commitBatch(
      containers,
      [member("a", "todo"), member("d", "todo")],
      "done",
      0,
      (item) => item.id !== "d",
    );
    expect(blocked).toBeNull();
    expect(sameOrders(containers, { todo: ["a", "b", "c", "d"], doing: ["e"], done: [] })).toBe(
      true,
    );
  });

  it("keeps MoveIntent.itemId a single id", () => {
    const intent: MoveIntent<{ id: string }> = buildMoveIntent({
      itemId: "a",
      sourceContainerId: "todo",
      targetContainerId: "done",
      targetIndex: 0,
      data: { id: "a" },
    });
    expect(intent.kind).toBe("move");
    expect(intent.itemId).toBe("a");
  });
});
