import { indexAfterRemoval } from "@kamod-ch/dnd";

export const VIEWPORT_PX = 500;
export const ROW_MIN_PX = 30;
export const ROW_MAX_PX = 80;

export function rowHeight(index: number): number {
  const span = ROW_MAX_PX - ROW_MIN_PX + 1;
  return ROW_MIN_PX + ((index * 17) % span);
}

export function offsetForIndex(index: number): number {
  let offset = 0;
  for (let i = 0; i < index; i += 1) offset += rowHeight(i);
  return offset;
}

export function indexAtOffset(count: number, offset: number): number {
  if (count <= 0) return 0;
  let cursor = 0;
  for (let i = 0; i < count; i += 1) {
    const next = cursor + rowHeight(i);
    if (offset < next) return i;
    cursor = next;
  }
  return count - 1;
}

export type MountedWindow = { start: number; end: number };

export function isMounted(index: number, mounted: MountedWindow): boolean {
  return index >= mounted.start && index < mounted.end;
}

/** Container hits have no row id, so the public helper appends. */
export function libraryIndexForContainerHit(ids: readonly string[], activeId: string): number {
  return indexAfterRemoval(ids, ids, activeId, null, "bottom", true);
}

export function unmountedDropGap(args: {
  ids: readonly string[];
  activeId: string;
  pointerOffset: number;
  mounted: MountedWindow;
}): { visualIndex: number; libraryIndex: number; destinationMounted: boolean } {
  const visualIndex = indexAtOffset(args.ids.length, args.pointerOffset);
  return {
    visualIndex,
    libraryIndex: libraryIndexForContainerHit(args.ids, args.activeId),
    destinationMounted: isMounted(visualIndex, args.mounted),
  };
}
