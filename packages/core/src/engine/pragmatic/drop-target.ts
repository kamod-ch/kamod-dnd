import { CONTAINER_TYPE, ITEM_TYPE, SCOPE_KEY } from "./types.js";

export type DropTargetLike = {
  data: Record<string, unknown>;
};

/**
 * Pragmatic lists drop targets from most specific (inner) to outer.
 * Flat lists: prefer item targets for closest-edge reordering in one container.
 * Trees: when a nested container appears before its parent item in the stack,
 * prefer that container (empty child drop zone or column shell).
 */
export function pickActiveDropTarget(
  dropTargets: ReadonlyArray<DropTargetLike>,
): DropTargetLike | null {
  if (dropTargets.length === 0) return null;

  const itemIndex = dropTargets.findIndex((t) => t.data.type === ITEM_TYPE);
  const containerIndex = dropTargets.findIndex((t) => t.data.type === CONTAINER_TYPE);

  if (itemIndex >= 0 && containerIndex >= 0) {
    if (containerIndex <= itemIndex) {
      return dropTargets[containerIndex]!;
    }
    return dropTargets[itemIndex]!;
  }

  if (itemIndex >= 0) return dropTargets[itemIndex]!;
  if (containerIndex >= 0) return dropTargets[containerIndex]!;
  return dropTargets[0] ?? null;
}

export function selectScopedDropTarget(
  dropTargets: ReadonlyArray<DropTargetLike>,
  scope: string,
): DropTargetLike | null {
  return pickActiveDropTarget(dropTargets.filter((target) => target.data[SCOPE_KEY] === scope));
}
