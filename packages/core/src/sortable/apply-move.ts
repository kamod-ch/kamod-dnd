import type { DndId, MoveIntent } from "../session/types.js";
import { transferId } from "./move-helpers.js";

export function applyMoveIntentToIds(
  containers: Record<DndId, DndId[]>,
  intent: MoveIntent,
): Record<DndId, DndId[]> {
  const source = containers[intent.sourceContainerId] ?? [];
  const target = containers[intent.targetContainerId] ?? [];
  if (intent.sourceContainerId === intent.targetContainerId) {
    const from = source.indexOf(intent.itemId);
    if (from < 0) return containers;
    const next = [...source];
    next.splice(from, 1);
    const insertAt = Math.max(0, Math.min(intent.targetIndex, next.length));
    next.splice(insertAt, 0, intent.itemId);
    return { ...containers, [intent.sourceContainerId]: next };
  }
  const { source: nextSource, target: nextTarget } = transferId(
    source,
    target,
    intent.itemId,
    intent.targetIndex,
  );
  return {
    ...containers,
    [intent.sourceContainerId]: [...nextSource],
    [intent.targetContainerId]: [...nextTarget],
  };
}
