import { useEffect, useLayoutEffect, useMemo, useRef } from "preact/hooks";
import { useDndContext } from "../preact/context.js";
import {
  useDraggable,
  useDroppable,
  useSortableContainerPreview,
  useSortableItemState,
} from "../preact/hooks.js";
import type { DndId, GetContainerDropIndex, SortableOrientation } from "../session/types.js";
import { computeKeyboardMove, type KeyboardMoveAction } from "../accessibility/keyboard.js";
import { readDirection } from "./orientation.js";
import { handleSortableHandleKeyDown } from "./handle-keyboard.js";

export { applyMoveIntentToIds } from "./apply-move.js";

export type SortableContainerProps = {
  id: DndId;
  itemIds: readonly DndId[];
  disabled?: boolean;
  orientation?: SortableOrientation;
  getDropIndex?: GetContainerDropIndex;
};

export function useSortableContainer(props: SortableContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { controller } = useDndContext();
  const orientation = props.orientation ?? "vertical";
  const getDropIndexRef = useRef(props.getDropIndex);
  getDropIndexRef.current = props.getDropIndex;

  useEffect(() => {
    controller.setContainerOrder(props.id, [...props.itemIds]);
  }, [controller, props.id, props.itemIds]);

  useEffect(() => {
    controller.updateContainerRegistration({
      id: props.id,
      orientation,
      getDropIndex: getDropIndexRef.current,
    });
  }, [controller, props.id, orientation, props.getDropIndex]);

  useDroppable({
    ref,
    options: {
      id: props.id,
      kind: "container",
      containerId: props.id,
      disabled: props.disabled,
      orientation,
    },
  });

  const previewIndex = useSortableContainerPreview(props.id);

  return { ref, previewIndex };
}

export type SortableItemProps<TData> = {
  id: DndId;
  containerId: DndId;
  data: TData;
  disabled?: boolean;
};

export function useSortable<TData>(props: SortableItemProps<TData>) {
  const itemRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);
  const { controller, announce, itemLabel, containerLabel, restoreHandleFocus } =
    useDndContext<TData>();

  useDraggable({
    itemRef,
    handleRef,
    options: {
      id: props.id,
      containerId: props.containerId,
      data: props.data,
      disabled: props.disabled,
    },
  });

  useDroppable({
    ref: itemRef,
    options: {
      id: props.id,
      kind: "item",
      containerId: props.containerId,
      disabled: props.disabled,
    },
  });

  const { isDragging, isOver } = useSortableItemState(props.id);

  useLayoutEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const reg = controller.getContainerRegistration(props.containerId);
      const orientation = reg?.orientation ?? "vertical";
      const direction = readDirection(itemRef.current?.parentElement ?? handle);
      handleSortableHandleKeyDown({
        event,
        controller,
        itemId: props.id,
        containerId: props.containerId,
        orientation,
        direction,
        disabled: props.disabled,
      });
    };
    handle.addEventListener("keydown", onKeyDown);
    return () => handle.removeEventListener("keydown", onKeyDown);
  }, [controller, props.id, props.containerId, props.disabled]);

  const moveByKeyboard = (action: KeyboardMoveAction) => {
    const order = controller.getContainerIds(props.containerId);
    const targetOrder =
      action.type === "transfer" ? controller.getContainerIds(action.targetContainerId) : order;
    const intent = computeKeyboardMove({
      action,
      itemId: props.id,
      containerId: props.containerId,
      order,
      containers: targetOrder,
      data: props.data,
    });
    if (!intent) return;
    if (!controller.tryCommitMove(intent)) return;
    restoreHandleFocus(props.id);
    const item = itemLabel(props.id, props.data);
    if (intent.sourceContainerId === intent.targetContainerId) {
      announce("moved", { item, position: String(intent.targetIndex + 1) });
      return;
    }
    announce("movedToContainer", {
      item,
      container: containerLabel(intent.targetContainerId),
    });
  };

  const handleProps = useMemo(() => {
    return {
      ref: handleRef,
      type: "button" as const,
      disabled: props.disabled,
      style: {
        touchAction: "none" as const,
        cursor: props.disabled ? "not-allowed" : "grab",
      },
    };
  }, [props.disabled]);

  return {
    itemRef,
    handleRef,
    handleProps,
    isDragging,
    isOver,
    moveByKeyboard,
  };
}
