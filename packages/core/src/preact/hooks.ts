import { useEffect, useLayoutEffect, useState } from "preact/hooks";
import { useDndContext } from "./context.js";
import type { DndId, DndSessionSnapshot } from "../session/types.js";
import type { ItemSessionState } from "../session/controller.js";
import {
  registerContainerDropTarget,
  registerDraggableElement,
  registerItemDropTarget,
} from "../engine/pragmatic/bindings.js";
import { readDirection } from "../sortable/orientation.js";
import type { SortableOrientation } from "../session/types.js";

export function useDndState<TData>(): DndSessionSnapshot<TData> {
  const { controller } = useDndContext<TData>();
  const [snapshot, setSnapshot] = useState(() => controller.readSnapshot());
  useEffect(() => {
    const signals = controller.signals;
    const update = () => setSnapshot(controller.readSnapshot());
    const disposers = Object.values(signals).map((sig) => sig.subscribe(update));
    return () => disposers.forEach((d) => d());
  }, [controller]);
  return snapshot as DndSessionSnapshot<TData>;
}

export function useSortableItemState(itemId: DndId): ItemSessionState {
  const { controller } = useDndContext();
  const [state, setState] = useState<ItemSessionState>(() => ({
    isDragging: false,
    isOver: false,
  }));
  useEffect(() => {
    return controller.subscribeToItemState(itemId, setState);
  }, [controller, itemId]);
  return state;
}

export function useSortableContainerPreview(containerId: DndId): number | null {
  const { controller } = useDndContext();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  useEffect(() => {
    return controller.subscribeToContainerPreview(containerId, setPreviewIndex);
  }, [controller, containerId]);
  return previewIndex;
}

export type UseDraggableOptions<TData> = {
  id: DndId;
  containerId: DndId;
  data: TData;
  disabled?: boolean;
};

export function useDraggable<TData>(args: {
  itemRef: { current: HTMLElement | null };
  handleRef: { current: HTMLElement | null };
  options: UseDraggableOptions<TData>;
}): void {
  const { controller } = useDndContext<TData>();
  const { id, containerId, data, disabled } = args.options;

  useEffect(() => {
    controller.registerItem({ id, containerId, data, disabled });
    return () => controller.detachItem(id);
  }, [controller, id]);

  useEffect(() => {
    controller.updateItemRegistration({ id, containerId, data, disabled });
  }, [controller, id, containerId, data, disabled]);

  useLayoutEffect(() => {
    const handle = args.handleRef.current;
    if (!handle) return;
    controller.registerHandle(id, handle);
    return () => controller.unregisterHandle(id, handle);
  }, [controller, id, args.handleRef]);

  useLayoutEffect(() => {
    const element = args.itemRef.current;
    if (!element) return;
    controller.registerItemElement(id, element);
    return () => controller.unregisterItemElement(id, element);
  }, [controller, id, args.itemRef]);

  useEffect(() => {
    const element = args.itemRef.current;
    const handle = args.handleRef.current;
    if (!element || !handle) return;
    if (controller.isItemDetached(id)) return () => {};
    return registerDraggableElement({
      element,
      handle,
      itemId: id,
      containerId,
      scope: controller.scopeToken,
      controller,
      disabled,
    });
  }, [controller, id, containerId, disabled, args.itemRef, args.handleRef]);
}

export type UseDroppableOptions = {
  id: DndId;
  kind: "container" | "item";
  containerId: DndId;
  disabled?: boolean;
  orientation?: SortableOrientation;
};

export function useDroppable(args: {
  ref: { current: HTMLElement | null };
  options: UseDroppableOptions;
}): void {
  const { controller } = useDndContext();
  const { id, kind, containerId, disabled, orientation = "vertical" } = args.options;

  useLayoutEffect(() => {
    if (kind === "container") {
      const element = args.ref.current;
      controller.registerContainer({
        id: containerId,
        disabled,
        orientation: args.options.orientation,
      });
      if (element) {
        controller.updateContainerRegistration({
          id: containerId,
          direction: readDirection(element),
        });
      }
      return () => controller.unregisterContainer(containerId);
    }
    return undefined;
  }, [controller, kind, containerId, disabled, id, args.options.orientation, args.ref]);

  useLayoutEffect(() => {
    const element = args.ref.current;
    if (!element) return;
    if (kind === "container") {
      controller.updateContainerRegistration({
        id: containerId,
        direction: readDirection(element),
      });
      return registerContainerDropTarget({
        element,
        containerId,
        scope: controller.scopeToken,
        disabled,
      });
    }
    const containerOrientation =
      controller.getContainerRegistration(containerId)?.orientation ?? orientation;
    return registerItemDropTarget({
      element,
      itemId: id,
      containerId,
      scope: controller.scopeToken,
      disabled,
      orientation: containerOrientation,
    });
  }, [controller, id, kind, containerId, disabled, orientation, args.ref]);
}
