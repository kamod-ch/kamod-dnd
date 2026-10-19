import { useEffect, useRef } from "preact/hooks";
import { useDndContext } from "../preact/context.js";
import { useDraggable, useDroppable, useDndState } from "../preact/hooks.js";
import type { DndId } from "../session/types.js";
import { computeKeyboardMove, type KeyboardMoveAction } from "../accessibility/keyboard.js";

export { applyMoveIntentToIds } from "./apply-move.js";

export type SortableContainerProps = {
  id: DndId;
  itemIds: readonly DndId[];
  disabled?: boolean;
};

export function useSortableContainer(props: SortableContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { controller } = useDndContext();

  useEffect(() => {
    controller.setContainerOrder(props.id, [...props.itemIds]);
  }, [controller, props.id, props.itemIds]);

  useDroppable({
    ref,
    options: {
      id: props.id,
      kind: "container",
      containerId: props.id,
      disabled: props.disabled,
    },
  });

  const state = useDndState();
  const previewInContainer = state.previewContainerId === props.id ? state.previewIndex : null;

  return { ref, previewIndex: previewInContainer };
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
  const { controller, announce } = useDndContext<TData>();

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

  const state = useDndState<TData>();
  const isDragging = state.activeId === props.id;
  const isOver = state.overId === props.id;

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
    if (intent.sourceContainerId === intent.targetContainerId) {
      announce("moved", { item: props.id, position: String(intent.targetIndex + 1) });
      return;
    }
    announce("movedToContainer", { item: props.id, container: intent.targetContainerId });
  };

  return {
    itemRef,
    handleRef,
    isDragging,
    isOver,
    moveByKeyboard,
  };
}
