import type { MoveIntent } from "@kamod-ch/dnd";

export function formatMove(
  itemLabel: string,
  intent: MoveIntent,
  containerLabel: (id: string) => string = (id) => id,
): string {
  const index = `index ${intent.targetIndex}`;
  if (intent.sourceContainerId === intent.targetContainerId) {
    return `${itemLabel} → ${index}`;
  }
  const source = containerLabel(String(intent.sourceContainerId));
  const target = containerLabel(String(intent.targetContainerId));
  return `${itemLabel}: ${source} → ${target}, ${index}`;
}
