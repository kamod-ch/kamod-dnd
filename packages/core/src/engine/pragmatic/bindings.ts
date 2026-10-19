import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import type { DndController } from "../../session/controller.js";
import type { DndId } from "../../session/types.js";
import { selectScopedDropTarget, type DropTargetLike } from "./drop-target.js";
import { CONTAINER_TYPE, ITEM_TYPE, SCOPE_KEY } from "./types.js";

export type EngineBindingOptions = {
  scrollElement?: HTMLElement | null;
};

export function ownsElementSource(data: Record<string, unknown>, scope: string): boolean {
  return data.type === ITEM_TYPE && data[SCOPE_KEY] === scope;
}

export function deliverElementDragStart<TData>(
  controller: DndController<TData>,
  data: Record<string, unknown>,
): boolean {
  if (!ownsElementSource(data, controller.scopeToken)) return false;
  controller.handleDragStart(String(data.itemId));
  return true;
}

export function deliverElementDragOver<TData>(
  controller: DndController<TData>,
  data: Record<string, unknown>,
  dropTargets: ReadonlyArray<DropTargetLike>,
): void {
  if (!ownsElementSource(data, controller.scopeToken)) return;
  const target = selectScopedDropTarget(dropTargets, controller.scopeToken);
  if (!target) {
    controller.clearDragTarget();
    return;
  }
  const isContainer = target.data.type === CONTAINER_TYPE;
  const edge = isContainer ? "bottom" : extractClosestEdge(target.data);
  controller.handleDragOver({
    overId: isContainer ? null : target.data.itemId ? String(target.data.itemId) : null,
    overContainerId: String(target.data.containerId),
    edge,
  });
}

export function deliverElementDrag<TData>(
  controller: DndController<TData>,
  data: Record<string, unknown>,
  dropTargets: ReadonlyArray<DropTargetLike>,
): void {
  if (!deliverElementDragStart(controller, data)) return;
  deliverElementDragOver(controller, data, dropTargets);
}

export function deliverElementDrop<TData>(
  controller: DndController<TData>,
  data: Record<string, unknown>,
): void {
  if (!ownsElementSource(data, controller.scopeToken)) return;
  controller.handleDrop();
}

export function bindPragmaticEngine<TData>(
  controller: DndController<TData>,
  options: EngineBindingOptions = {},
): () => void {
  const cleanups: Array<() => void> = [];
  const scope = controller.scopeToken;

  cleanups.push(
    monitorForElements({
      canMonitor: ({ source }) => ownsElementSource(source.data, scope),
      onDragStart: ({ source }) => {
        deliverElementDragStart(controller, source.data);
      },
      onDrag: ({ source, location }) => {
        deliverElementDragOver(controller, source.data, location.current.dropTargets);
      },
      onDrop: ({ source }) => {
        deliverElementDrop(controller, source.data);
      },
    }),
  );

  if (options.scrollElement) {
    cleanups.push(autoScrollForElements({ element: options.scrollElement }));
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      controller.cancel("escape");
    }
  };
  window.addEventListener("keydown", onKeyDown);
  cleanups.push(() => window.removeEventListener("keydown", onKeyDown));

  return () => {
    for (const fn of cleanups) fn();
  };
}

export function registerDraggableElement<TData>(args: {
  element: HTMLElement;
  handle: HTMLElement;
  itemId: DndId;
  containerId: DndId;
  scope: string;
  controller: DndController<TData>;
  disabled?: boolean;
}): () => void {
  if (args.disabled) return () => {};
  return draggable({
    element: args.element,
    dragHandle: args.handle,
    getInitialData: () => ({
      type: ITEM_TYPE,
      itemId: args.itemId,
      containerId: args.containerId,
      [SCOPE_KEY]: args.scope,
    }),
  });
}

export function registerItemDropTarget(args: {
  element: HTMLElement;
  itemId: DndId;
  containerId: DndId;
  scope: string;
  disabled?: boolean;
}): () => void {
  if (args.disabled) return () => {};
  return dropTargetForElements({
    element: args.element,
    getData: ({ input, element }) =>
      attachClosestEdge(
        {
          type: ITEM_TYPE,
          itemId: args.itemId,
          containerId: args.containerId,
          [SCOPE_KEY]: args.scope,
        },
        {
          element,
          input,
          allowedEdges: ["top", "bottom"] as Edge[],
        },
      ),
  });
}

export function registerContainerDropTarget(args: {
  element: HTMLElement;
  containerId: DndId;
  scope: string;
  disabled?: boolean;
}): () => void {
  if (args.disabled) return () => {};
  return dropTargetForElements({
    element: args.element,
    getData: () => ({
      type: CONTAINER_TYPE,
      containerId: args.containerId,
      [SCOPE_KEY]: args.scope,
    }),
  });
}
