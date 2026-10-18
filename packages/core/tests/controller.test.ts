import { describe, expect, it, vi } from "vitest";
import { DndController } from "../src/session/controller.js";
import { applyMoveIntentToIds } from "../src/sortable/hooks.js";
import { buildMoveIntent, isNoOpMove } from "../src/sortable/move-helpers.js";

describe("DndController", () => {
  function setupList(controller: DndController<{ n: number }>, ids: string[]) {
    controller.registerContainer({ id: "list" });
    controller.setContainerOrder("list", ids);
    for (const id of ids) {
      controller.registerItem({ id, containerId: "list", data: { n: 1 } });
    }
  }

  it("sets canDrop false when dropRule rejects", () => {
    const controller = new DndController<{ n: number }>({
      dropRule: () => false,
    });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "b",
      overContainerId: "list",
      edge: "bottom",
    });
    expect(controller.readSnapshot().canDrop).toBe(false);
  });

  it("cancels drop when dropRule rejects on handleDrop", () => {
    const onCancel = vi.fn();
    const onMove = vi.fn();
    const controller = new DndController<{ n: number }>({
      dropRule: () => false,
      onCancel,
      onMove,
    });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "b",
      overContainerId: "list",
      edge: "bottom",
    });
    controller.handleDrop();
    expect(onCancel).toHaveBeenCalledWith("rejected");
    expect(onMove).not.toHaveBeenCalled();
    expect(controller.readSnapshot().phase).toBe("idle");
  });

  it("cancels when onMove returns false", () => {
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({
      onMove: () => false,
      onCancel,
    });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "b",
      overContainerId: "list",
      edge: "bottom",
    });
    controller.handleDrop();
    expect(onCancel).toHaveBeenCalledWith("rejected");
  });

  it("cancels when active item is unregistered during drag", () => {
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onCancel });
    setupList(controller, ["a"]);
    controller.handleDragStart("a");
    expect(controller.readSnapshot().phase).toBe("dragging");
    controller.unregisterItem("a");
    expect(onCancel).toHaveBeenCalledWith("source-removed");
    expect(controller.readSnapshot().phase).toBe("idle");
  });

  it("tryCommitMove returns false when dropRule rejects", () => {
    const controller = new DndController<{ n: number }>({
      dropRule: () => false,
    });
    setupList(controller, ["a"]);
    const intent = buildMoveIntent({
      itemId: "a",
      sourceContainerId: "list",
      targetContainerId: "list",
      targetIndex: 0,
      data: { n: 1 },
    });
    expect(controller.tryCommitMove(intent)).toBe(false);
  });
});

describe("no-op moves", () => {
  it("isNoOpMove detects unchanged slot", () => {
    const intent = buildMoveIntent({
      itemId: "a",
      sourceContainerId: "list",
      targetContainerId: "list",
      targetIndex: 0,
      data: {},
    });
    expect(isNoOpMove(intent, 0)).toBe(true);
    expect(isNoOpMove(intent, 1)).toBe(false);
  });

  it("applyMoveIntentToIds leaves order unchanged for no-op index", () => {
    const containers = { list: ["a", "b", "c"] };
    const intent = buildMoveIntent({
      itemId: "b",
      sourceContainerId: "list",
      targetContainerId: "list",
      targetIndex: 1,
      data: {},
    });
    const next = applyMoveIntentToIds(containers, intent);
    expect(next.list).toEqual(["a", "b", "c"]);
  });
});
