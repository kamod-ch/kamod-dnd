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
import { pickActiveDropTarget } from "./drop-target.js";
import { CONTAINER_TYPE, ITEM_TYPE } from "./types.js";

export type EngineBindingOptions = {
  scrollElement?: HTMLElement | null;
  onEscape?: () => void;
};

export function bindPragmaticEngine<TData>(
  controller: DndController<TData>,
  options: EngineBindingOptions = {},
): () => void {
  const cleanups: Array<() => void> = [];

  cleanups.push(
    monitorForElements({
      onDragStart: ({ source }) => {
        if (source.data.type !== ITEM_TYPE) return;
        controller.handleDragStart(String(source.data.itemId));
      },
      onDrag: ({ location }) => {
        const target = pickActiveDropTarget(location.current.dropTargets);
        if (!target) {
          return;
        }
        const isContainer = target.data.type === CONTAINER_TYPE;
        const edge = isContainer ? "bottom" : extractClosestEdge(target.data);
        controller.handleDragOver({
          overId: isContainer ? null : target.data.itemId ? String(target.data.itemId) : null,
          overContainerId: String(target.data.containerId),
          edge,
        });
      },
      onDrop: () => {
        controller.handleDrop();
      },
    }),
  );

  if (options.scrollElement) {
    cleanups.push(autoScrollForElements({ element: options.scrollElement }));
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      controller.cancel("escape");
      options.onEscape?.();
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
    }),
  });
}

export function registerItemDropTarget(args: {
  element: HTMLElement;
  itemId: DndId;
  containerId: DndId;
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
  disabled?: boolean;
}): () => void {
  if (args.disabled) return () => {};
  return dropTargetForElements({
    element: args.element,
    getData: () => ({
      type: CONTAINER_TYPE,
      containerId: args.containerId,
    }),
  });
}
