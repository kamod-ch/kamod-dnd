export type DndMessageKey =
  | "pickedUp"
  | "moved"
  | "movedToContainer"
  | "dropped"
  | "cancelled"
  | "pickedUpBatch"
  | "movedBatchToContainer"
  | "droppedBatch"
  | "cancelledBatch"
  | "reparented";

export type DndMessages = Record<DndMessageKey, (args: Record<string, string>) => string>;

export const defaultMessages: DndMessages = {
  pickedUp: ({ item }) => `Picked up ${item}.`,
  moved: ({ item, position }) => `Moved ${item} to position ${position}.`,
  movedToContainer: ({ item, container }) => `Moved ${item} to ${container}.`,
  dropped: ({ item }) => `Dropped ${item}.`,
  cancelled: ({ item }) => `Cancelled moving ${item}.`,
  pickedUpBatch: ({ count, items }) => `Picked up ${count} items: ${items}.`,
  movedBatchToContainer: ({ count, container }) => `Moved ${count} items to ${container}.`,
  droppedBatch: ({ count }) => `Dropped ${count} items.`,
  cancelledBatch: ({ item }) => `Cancelled moving ${item}.`,
  reparented: ({ item, container }) => `Moved ${item} under ${container}.`,
};

export type DndLocale = {
  messages?: Partial<DndMessages>;
};

export function resolveMessage(
  locale: DndLocale | undefined,
  key: DndMessageKey,
  args: Record<string, string>,
): string {
  const fn = locale?.messages?.[key] ?? defaultMessages[key];
  return fn(args);
}
