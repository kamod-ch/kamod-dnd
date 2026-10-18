import type { DndId, MoveIntent } from "../session/types.js";

export type IdList = readonly DndId[];

/** Reorder within one container; returns new id array (does not mutate input). */
export function reorderIds(
  ids: IdList,
  activeId: DndId,
  overId: DndId,
  edge: "top" | "bottom",
): IdList {
  const from = ids.indexOf(activeId);
  const over = ids.indexOf(overId);
  if (from < 0 || over < 0 || from === over) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  let insertAt = over;
  if (from < over) insertAt = over - 1;
  if (edge === "bottom") insertAt += 1;
  next.splice(insertAt, 0, activeId);
  return next;
}

/** Transfer item to another container at targetIndex (after source removal). */
export function transferId(
  sourceIds: IdList,
  targetIds: IdList,
  itemId: DndId,
  targetIndex: number,
): { source: IdList; target: IdList } {
  const from = sourceIds.indexOf(itemId);
  if (from < 0) return { source: [...sourceIds], target: [...targetIds] };
  const source = [...sourceIds];
  source.splice(from, 1);
  const target = [...targetIds];
  const clamped = Math.max(0, Math.min(targetIndex, target.length));
  target.splice(clamped, 0, itemId);
  return { source, target };
}

export function buildMoveIntent<TData>(args: {
  itemId: DndId;
  sourceContainerId: DndId;
  targetContainerId: DndId;
  targetIndex: number;
  data: TData;
}): MoveIntent<TData> {
  return {
    kind: "move",
    itemId: args.itemId,
    sourceContainerId: args.sourceContainerId,
    targetContainerId: args.targetContainerId,
    targetIndex: args.targetIndex,
    data: args.data,
  };
}

export function isNoOpMove(intent: MoveIntent, sourceIndex: number): boolean {
  return (
    intent.sourceContainerId === intent.targetContainerId && intent.targetIndex === sourceIndex
  );
}

export function indexAfterRemoval(
  sourceIds: IdList,
  targetIds: IdList,
  itemId: DndId,
  overId: DndId | null,
  edge: "top" | "bottom",
  sameContainer: boolean,
): number {
  if (!overId) return targetIds.length;
  const overIndex = targetIds.indexOf(overId);
  if (overIndex < 0) return targetIds.length;
  let idx = edge === "bottom" ? overIndex + 1 : overIndex;
  if (sameContainer) {
    const from = sourceIds.indexOf(itemId);
    if (from >= 0 && from < idx) idx -= 1;
  }
  return Math.max(0, Math.min(idx, targetIds.length));
}
