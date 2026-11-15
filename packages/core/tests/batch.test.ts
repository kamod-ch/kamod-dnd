import { describe, expect, it } from "vitest";
import { buildMoveIntent } from "../src/sortable/move-helpers.js";
import {
  applyBatchToContainers,
  batchIndexFromSingle,
  commitBatchMove,
  stableBatchMembers,
  type BatchMember,
} from "../src/sortable/batch.js";
import { DndController } from "../src/session/controller.js";

const containers = {
  todo: ["a", "b", "c", "d"],
  doing: ["e"],
  done: [] as string[],
};

function member(id: string, containerId: string): BatchMember<{ id: string }> {
  return { id, containerId, data: { id } };
}

describe("batch move helpers", () => {
  it("keeps stable container order for members", () => {
    const members = stableBatchMembers(
      ["todo", "doing", "done"],
      containers,
      new Set(["c", "a", "e"]),
      (id) => ({ id }),
    );
    expect(members.map((item) => item.id)).toEqual(["a", "c", "e"]);
  });

  it("rejects the whole batch when one member is blocked", () => {
    const snapshot = structuredClone(containers);
    const committed = commitBatchMove(
      containers,
      [member("a", "todo"), member("d", "todo")],
      "done",
      0,
      (item) => item.id !== "d",
    );
    expect(committed).toBeNull();
    expect(containers).toEqual(snapshot);
  });

  it("maps single-target index to batch index", () => {
    const index = batchIndexFromSingle({
      targetIds: ["a", "b", "c", "d"],
      activeId: "a",
      selected: new Set(["a", "c"]),
      singleTargetIndex: 3,
      sameContainer: true,
    });
    expect(index).toBe(2);
    expect(
      applyBatchToContainers(containers, [member("a", "todo"), member("c", "todo")], "todo", index),
    ).toMatchObject({ todo: ["b", "d", "a", "c"] });
  });
});

describe("DndController.tryCommitBatch", () => {
  it("emits dropBatch and calls onBatchMove", () => {
    const events: string[] = [];
    const controller = new DndController<{ id: string }>({
      onBatchMove: () => {
        events.push("move");
        return true;
      },
    });
    controller.subscribe((event) => {
      if (event.type === "dropBatch") events.push("dropBatch");
    });
    controller.registerContainer({ id: "todo" });
    controller.registerContainer({ id: "done" });
    controller.setContainerOrder("todo", ["a", "b"]);
    controller.setContainerOrder("done", []);
    const ok = controller.tryCommitBatch({
      kind: "batch",
      itemIds: ["a", "b"],
      targetContainerId: "done",
      targetIndex: 0,
      members: [
        { id: "a", containerId: "todo", data: { id: "a" } },
        { id: "b", containerId: "todo", data: { id: "b" } },
      ],
    });
    expect(ok).toBe(true);
    expect(events).toEqual(["move", "dropBatch"]);
  });

  it("uses dropRule when batchDropRule is absent", () => {
    const controller = new DndController<{ id: string }>({
      dropRule: (intent) => intent.itemId !== "d",
      onBatchMove: () => true,
    });
    controller.registerContainer({ id: "todo" });
    controller.setContainerOrder("todo", ["a", "d"]);
    const blocked = controller.tryCommitBatch({
      kind: "batch",
      itemIds: ["a", "d"],
      targetContainerId: "todo",
      targetIndex: 0,
      members: [
        { id: "a", containerId: "todo", data: { id: "a" } },
        { id: "d", containerId: "todo", data: { id: "d" } },
      ],
    });
    expect(blocked).toBe(false);
  });

  it("returns false without onBatchMove", () => {
    const events: string[] = [];
    const controller = new DndController<{ id: string }>({});
    controller.subscribe((event) => events.push(event.type));
    controller.registerContainer({ id: "todo" });
    controller.setContainerOrder("todo", ["a"]);
    const ok = controller.tryCommitBatch({
      kind: "batch",
      itemIds: ["a"],
      targetContainerId: "todo",
      targetIndex: 0,
      members: [{ id: "a", containerId: "todo", data: { id: "a" } }],
    });
    expect(ok).toBe(false);
    expect(events).toEqual([]);
  });

  it("rejects members not in registered container order", () => {
    const controller = new DndController<{ id: string }>({
      onBatchMove: () => true,
    });
    controller.registerContainer({ id: "todo" });
    controller.setContainerOrder("todo", ["a"]);
    const ok = controller.tryCommitBatch({
      kind: "batch",
      itemIds: ["a"],
      targetContainerId: "todo",
      targetIndex: 0,
      members: [{ id: "a", containerId: "doing", data: { id: "a" } }],
    });
    expect(ok).toBe(false);
  });

  it("does not change MoveIntent shape", () => {
    const intent = buildMoveIntent({
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
