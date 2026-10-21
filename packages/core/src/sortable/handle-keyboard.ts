import type { DndController } from "../session/controller.js";
import type { DndId, SortableOrientation } from "../session/types.js";
import type { Direction } from "./orientation.js";

export function handleSortableHandleKeyDown<TData>(args: {
  event: KeyboardEvent;
  controller: DndController<TData>;
  itemId: DndId;
  containerId: DndId;
  orientation: SortableOrientation;
  direction: Direction;
  disabled?: boolean;
}): void {
  if (args.disabled) return;
  const { event, controller, itemId, containerId, orientation, direction } = args;
  const phase = controller.readSnapshot().phase;

  if (event.key === "Escape") {
    return;
  }

  if (phase === "idle") {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    controller.handleDragStart(itemId);
    const order = controller.getContainerIds(containerId);
    const idx = order.indexOf(itemId);
    if (idx >= 0) controller.setPreviewIndex(containerId, idx);
    return;
  }

  if (phase !== "dragging" || controller.readSnapshot().activeId !== itemId) return;

  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    controller.handleDrop();
    return;
  }

  const order = controller.getContainerIds(containerId);
  const idx = order.indexOf(itemId);
  if (idx < 0) return;

  let delta = 0;
  if (orientation === "vertical") {
    if (event.key === "ArrowUp") delta = -1;
    if (event.key === "ArrowDown") delta = 1;
  } else {
    const leftIsBefore = direction === "ltr";
    if (event.key === "ArrowLeft") delta = leftIsBefore ? -1 : 1;
    if (event.key === "ArrowRight") delta = leftIsBefore ? 1 : -1;
  }
  if (delta === 0) return;
  event.preventDefault();
  const next = Math.max(0, Math.min(idx + delta, order.length - 1));
  if (next === idx) return;
  controller.setPreviewIndex(containerId, next);
}
