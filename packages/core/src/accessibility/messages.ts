export type DndMessageKey = "pickedUp" | "moved" | "movedToContainer" | "dropped" | "cancelled";

export type DndMessages = Record<DndMessageKey, (args: Record<string, string>) => string>;

export const defaultMessages: DndMessages = {
  pickedUp: ({ item }) => `Picked up ${item}.`,
  moved: ({ item, position }) => `Moved ${item} to position ${position}.`,
  movedToContainer: ({ item, container }) => `Moved ${item} to ${container}.`,
  dropped: ({ item }) => `Dropped ${item}.`,
  cancelled: ({ item }) => `Cancelled moving ${item}.`,
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
