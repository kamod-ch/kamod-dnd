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
import { bindPointerActivationOrigin, pointerActivationAllowsDrag } from "./pointer-activation.js";
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
  input?: { clientX: number; clientY: number },
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
    clientX: input?.clientX,
    clientY: input?.clientY,
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

export function elementDropShouldClear(args: {
  dropTargetCount: number;
  buttons: number;
}): boolean {
  return args.buttons !== 0 || args.dropTargetCount === 0;
}

export function deliverElementDrop<TData>(
  controller: DndController<TData>,
  data: Record<string, unknown>,
  dropTargets?: ReadonlyArray<DropTargetLike>,
): void {
  if (!ownsElementSource(data, controller.scopeToken)) return;
  if (dropTargets && dropTargets.length === 0) {
    controller.clearDragTarget();
  }
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
        deliverElementDragOver(
          controller,
          source.data,
          location.current.dropTargets,
          location.current.input,
        );
      },
      onDrop: ({ source, location }) => {
        const clear = elementDropShouldClear({
          dropTargetCount: location.current.dropTargets.length,
          buttons: location.current.input.buttons,
        });
        deliverElementDrop(controller, source.data, clear ? [] : undefined);
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
  const cleanups: Array<() => void> = [];
  cleanups.push(bindPointerActivationOrigin(args.handle));
  cleanups.push(
    draggable({
      element: args.element,
      dragHandle: args.handle,
      canDrag: ({ input }) =>
        pointerActivationAllowsDrag(args.handle, input, args.controller.pointerActivation),
      getInitialData: () => ({
        type: ITEM_TYPE,
        itemId: args.itemId,
        containerId: args.containerId,
        [SCOPE_KEY]: args.scope,
      }),
    }),
  );
  return () => cleanups.forEach((fn) => fn());
}

export function registerItemDropTarget(args: {
  element: HTMLElement;
  itemId: DndId;
  containerId: DndId;
  scope: string;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
}): () => void {
  if (args.disabled) return () => {};
  const allowedEdges: Edge[] =
    args.orientation === "horizontal"
      ? (["left", "right"] as Edge[])
      : (["top", "bottom"] as Edge[]);
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
          allowedEdges,
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
