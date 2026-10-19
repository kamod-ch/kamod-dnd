import { describe, expect, it, vi } from "vitest";
import { DndController } from "../src/session/controller.js";
import type { DndSessionEvent } from "../src/session/types.js";
import { applyMoveIntentToIds } from "../src/sortable/apply-move.js";
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

  it("cancels a drop that never hovered a target", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDrop();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("pointer-cancel");
    expect(controller.readSnapshot().phase).toBe("idle");
  });

  it("clears a stale preview when every target is left", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "b",
      overContainerId: "list",
      edge: "bottom",
    });
    controller.clearDragTarget();
    const snapshot = controller.readSnapshot();
    expect(snapshot.phase).toBe("dragging");
    expect(snapshot.overId).toBeNull();
    expect(snapshot.overContainerId).toBeNull();
    expect(snapshot.previewContainerId).toBeNull();
    expect(snapshot.previewIndex).toBeNull();
    expect(snapshot.canDrop).toBe(false);
    controller.handleDrop();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("pointer-cancel");
  });

  it("cancels once when the current target container is removed", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    controller.registerContainer({ id: "list" });
    controller.registerContainer({ id: "other" });
    controller.setContainerOrder("list", ["a"]);
    controller.setContainerOrder("other", ["c"]);
    controller.registerItem({ id: "a", containerId: "list", data: { n: 1 } });
    controller.registerItem({ id: "c", containerId: "other", data: { n: 1 } });
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "c",
      overContainerId: "other",
      edge: "bottom",
    });
    controller.unregisterContainer("other");
    controller.handleDrop();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("target-removed");
    expect(controller.readSnapshot().phase).toBe("idle");
  });

  it("does not commit after the active source item is removed", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "a",
      overContainerId: "list",
      edge: "bottom",
    });
    controller.unregisterItem("a");
    controller.handleDrop();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("source-removed");
  });

  it("does not commit after the source container is removed", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.unregisterContainer("list");
    controller.handleDrop();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("target-removed");
  });

  it("commits once after leaving targets and re-entering a valid one", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: "b",
      overContainerId: "list",
      edge: "bottom",
    });
    controller.clearDragTarget();
    controller.handleDragOver({
      overId: "b",
      overContainerId: "list",
      edge: "bottom",
    });
    controller.handleDrop();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(controller.readSnapshot().phase).toBe("idle");
  });

  it("cancels when the preview container is missing or disabled at commit", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const dropRule = vi.fn(() => true);
    const controller = new DndController<{ n: number }>({ onMove, onCancel, dropRule });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({
      overId: null,
      overContainerId: "missing",
      edge: "bottom",
    });
    dropRule.mockClear();
    controller.handleDrop();
    expect(dropRule).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("target-removed");

    const disabled = new DndController<{ n: number }>({ onMove, onCancel, dropRule });
    setupList(disabled, ["a", "b"]);
    disabled.registerContainer({ id: "other" });
    disabled.setContainerOrder("other", []);
    disabled.handleDragStart("a");
    disabled.handleDragOver({
      overId: null,
      overContainerId: "other",
      edge: "bottom",
    });
    disabled.registerContainer({ id: "other", disabled: true });
    disabled.handleDrop();
    expect(onMove).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenLastCalledWith("target-removed");
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
      targetIndex: 1,
      data: { n: 1 },
    });
    expect(controller.tryCommitMove(intent)).toBe(false);
  });
});

describe("session events", () => {
  function setupList(controller: DndController<{ n: number }>, ids: string[]) {
    controller.registerContainer({ id: "list" });
    controller.setContainerOrder("list", ids);
    for (const id of ids) {
      controller.registerItem({ id, containerId: "list", data: { n: 1 } });
    }
  }

  function eventsFor(controller: DndController<{ n: number }>) {
    const events: DndSessionEvent<{ n: number }>[] = [];
    const unsubscribe = controller.subscribe((event) => {
      events.push(event);
    });
    return { events, unsubscribe };
  }

  it("emits start, over, and drop with the active item before reset", () => {
    const controller = new DndController<{ n: number }>();
    const { events } = eventsFor(controller);
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({ overId: "b", overContainerId: "list", edge: "top" });
    controller.handleDragOver({ overId: "b", overContainerId: "list", edge: "top" });
    controller.handleDrop();
    expect(events.map((event) => event.type)).toEqual(["start", "over", "drop"]);
    expect(events[0]).toMatchObject({ type: "start", itemId: "a" });
    expect(events[1]).toMatchObject({
      type: "over",
      itemId: "a",
      containerId: "list",
      sourceContainerId: "list",
    });
    expect(events[2]).toMatchObject({ type: "drop", intent: { itemId: "a" } });
    expect(controller.readSnapshot().activeId).toBeNull();
  });

  it("emits cancel with the active item and no drop when the move is rejected", () => {
    const controller = new DndController<{ n: number }>({ dropRule: () => false });
    const { events } = eventsFor(controller);
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.handleDragOver({ overId: "b", overContainerId: "list", edge: "bottom" });
    controller.handleDrop();
    expect(events.map((event) => event.type)).toEqual(["start", "over", "cancel"]);
    expect(events.at(-1)).toMatchObject({ type: "cancel", itemId: "a", reason: "rejected" });
    expect(controller.readSnapshot().phase).toBe("idle");
  });

  it("emits cancel before reset when the drag is cancelled", () => {
    const controller = new DndController<{ n: number }>();
    const seen: Array<string | null> = [];
    controller.subscribe((event) => {
      if (event.type === "cancel") {
        seen.push(controller.readSnapshot().activeId);
      }
    });
    setupList(controller, ["a"]);
    controller.handleDragStart("a");
    controller.cancel("escape");
    expect(seen).toEqual(["a"]);
  });

  it("does not deliver events after unsubscribe or dispose", () => {
    const controller = new DndController<{ n: number }>();
    const { events, unsubscribe } = eventsFor(controller);
    setupList(controller, ["a"]);
    unsubscribe();
    controller.handleDragStart("a");
    expect(events).toEqual([]);

    const retained = new DndController<{ n: number }>();
    const heard = eventsFor(retained);
    setupList(retained, ["a"]);
    retained.handleDragStart("a");
    retained.dispose();
    setupList(retained, ["a"]);
    retained.handleDragStart("a");
    expect(heard.events.map((event) => event.type)).toEqual(["start", "cancel"]);
  });

  it("isolates a throwing listener so the session still resets", () => {
    const controller = new DndController<{ n: number }>();
    const heard: string[] = [];
    controller.subscribe(() => {
      throw new Error("listener failed");
    });
    controller.subscribe((event) => {
      heard.push(event.type);
    });
    setupList(controller, ["a"]);
    controller.handleDragStart("a");
    controller.cancel("escape");
    expect(heard).toEqual(["start", "cancel"]);
    expect(controller.readSnapshot().phase).toBe("idle");
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

describe("controlled session consistency", () => {
  function setupList(controller: DndController<{ n: number }>, ids: string[]) {
    controller.registerContainer({ id: "list" });
    controller.setContainerOrder("list", ids);
    for (const id of ids) {
      controller.registerItem({ id, containerId: "list", data: { n: 1 } });
    }
  }

  it("keeps the latest payload when data changes during a drag", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a", "b"]);
    controller.handleDragStart("a");
    controller.updateItemRegistration({ id: "a", containerId: "list", data: { n: 4 } });
    expect(onCancel).not.toHaveBeenCalled();
    expect(controller.readSnapshot().phase).toBe("dragging");
    controller.handleDragOver({ overId: "b", overContainerId: "list", edge: "bottom" });
    controller.handleDrop();
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove.mock.calls[0]?.[0].data).toEqual({ n: 4 });
  });

  it("cancels with disabled when the active item becomes disabled", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a"]);
    controller.handleDragStart("a");
    controller.updateItemRegistration({
      id: "a",
      containerId: "list",
      data: { n: 1 },
      disabled: true,
    });
    controller.handleDrop();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("disabled");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("cancels with external-data-change when the active item changes container", () => {
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onCancel });
    setupList(controller, ["a"]);
    controller.registerContainer({ id: "other" });
    controller.handleDragStart("a");
    controller.updateItemRegistration({ id: "a", containerId: "other", data: { n: 1 } });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("external-data-change");
  });

  it("cancels when the source or preview order changes and ignores unrelated orders", () => {
    const onMove = vi.fn();
    const onCancel = vi.fn();
    const controller = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(controller, ["a", "b"]);
    controller.registerContainer({ id: "other" });
    controller.setContainerOrder("other", ["c"]);
    controller.handleDragStart("a");
    controller.setContainerOrder("other", ["c"]);
    expect(onCancel).not.toHaveBeenCalled();
    controller.setContainerOrder("spare", []);
    controller.registerContainer({ id: "spare" });
    controller.setContainerOrder("spare", ["z"]);
    expect(controller.readSnapshot().phase).toBe("dragging");
    controller.handleDragOver({ overId: null, overContainerId: "other", edge: "bottom" });
    controller.setContainerOrder("other", ["c", "d"]);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("external-data-change");
    expect(onMove).not.toHaveBeenCalled();

    const source = new DndController<{ n: number }>({ onMove, onCancel });
    setupList(source, ["a", "b"]);
    source.handleDragStart("a");
    source.setContainerOrder("list", ["b", "a"]);
    source.handleDrop();
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("accepts same-position pointer and keyboard commits without mutation callbacks", () => {
    const onMove = vi.fn();
    const dropRule = vi.fn(() => true);
    const controller = new DndController<{ n: number }>({ onMove, dropRule });
    const events: string[] = [];
    controller.subscribe((event) => events.push(event.type));
    setupList(controller, ["a", "b", "c"]);
    for (const [id, edge] of [
      ["a", "top"],
      ["b", "top"],
      ["c", "bottom"],
    ] as const) {
      controller.handleDragStart(id);
      controller.handleDragOver({ overId: id, overContainerId: "list", edge });
      dropRule.mockClear();
      onMove.mockClear();
      controller.handleDrop();
      expect(onMove).not.toHaveBeenCalled();
      expect(dropRule).not.toHaveBeenCalled();
    }
    expect(events.filter((type) => type === "drop")).toHaveLength(3);

    const keyboard = buildMoveIntent({
      itemId: "b",
      sourceContainerId: "list",
      targetContainerId: "list",
      targetIndex: 1,
      data: { n: 1 },
    });
    expect(controller.tryCommitMove(keyboard)).toBe(true);
    expect(onMove).not.toHaveBeenCalled();
    expect(dropRule).not.toHaveBeenCalled();

    controller.handleDragStart("a");
    controller.handleDragOver({ overId: "b", overContainerId: "list", edge: "bottom" });
    dropRule.mockClear();
    onMove.mockClear();
    controller.handleDrop();
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(dropRule).toHaveBeenCalledTimes(1);
  });
});
