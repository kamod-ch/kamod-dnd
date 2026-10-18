import type { DndId } from "../session/types.js";
import type { MoveIntent } from "../session/types.js";

export type KeyboardMoveAction =
  | { type: "up" }
  | { type: "down" }
  | { type: "transfer"; targetContainerId: DndId };

export function computeKeyboardMove<TData>(args: {
  action: KeyboardMoveAction;
  itemId: DndId;
  containerId: DndId;
  order: readonly DndId[];
  containers: readonly DndId[];
  data: TData;
}): MoveIntent<TData> | null {
  const idx = args.order.indexOf(args.itemId);
  if (idx < 0) return null;

  if (args.action.type === "up") {
    if (idx === 0) return null;
    return {
      kind: "move",
      itemId: args.itemId,
      sourceContainerId: args.containerId,
      targetContainerId: args.containerId,
      targetIndex: idx - 1,
      data: args.data,
    };
  }

  if (args.action.type === "down") {
    if (idx >= args.order.length - 1) return null;
    return {
      kind: "move",
      itemId: args.itemId,
      sourceContainerId: args.containerId,
      targetContainerId: args.containerId,
      targetIndex: idx + 1,
      data: args.data,
    };
  }

  const targetContainerId = args.action.targetContainerId;
  const targetIndex = args.containers.length;
  return {
    kind: "move",
    itemId: args.itemId,
    sourceContainerId: args.containerId,
    targetContainerId,
    targetIndex,
    data: args.data,
  };
}
