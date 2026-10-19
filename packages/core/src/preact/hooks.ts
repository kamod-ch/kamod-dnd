import { useEffect, useLayoutEffect, useState } from "preact/hooks";
import { useDndContext } from "./context.js";
import type { DndId, DndSessionSnapshot } from "../session/types.js";
import {
  registerContainerDropTarget,
  registerDraggableElement,
  registerItemDropTarget,
} from "../engine/pragmatic/bindings.js";

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
    return () => controller.unregisterItem(id);
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

  useEffect(() => {
    const element = args.itemRef.current;
    const handle = args.handleRef.current;
    if (!element || !handle) return;
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
};

export function useDroppable(args: {
  ref: { current: HTMLElement | null };
  options: UseDroppableOptions;
}): void {
  const { controller } = useDndContext();
  const { id, kind, containerId, disabled } = args.options;

  useEffect(() => {
    if (kind === "container") {
      controller.registerContainer({ id: containerId, disabled });
      return () => controller.unregisterContainer(containerId);
    }
    return undefined;
  }, [controller, kind, containerId, disabled, id]);

  useEffect(() => {
    const element = args.ref.current;
    if (!element) return;
    if (kind === "container") {
      return registerContainerDropTarget({
        element,
        containerId,
        scope: controller.scopeToken,
        disabled,
      });
    }
    return registerItemDropTarget({
      element,
      itemId: id,
      containerId,
      scope: controller.scopeToken,
      disabled,
    });
  }, [controller, id, kind, containerId, disabled, args.ref]);
}
