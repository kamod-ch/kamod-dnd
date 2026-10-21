import type { SortableOrientation } from "../session/types.js";
import type { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";

export type Direction = "ltr" | "rtl";

/** Lists stay in source order. RTL changes which physical side is "before". */
export function physicalEdge(
  orientation: SortableOrientation,
  direction: Direction,
  logical: "before" | "after",
): Edge {
  if (orientation === "vertical") return logical === "before" ? "top" : "bottom";
  if (direction === "ltr") return logical === "before" ? "left" : "right";
  return logical === "before" ? "right" : "left";
}

export function indexEdgeFromPhysical(
  orientation: SortableOrientation,
  direction: Direction,
  physical: Edge | null,
): "top" | "bottom" {
  if (!physical) return "bottom";
  const before = physicalEdge(orientation, direction, "before");
  return physical === before ? "top" : "bottom";
}

export function readDirection(element: HTMLElement | null | undefined): Direction {
  if (!element) return "ltr";
  const dir = element.dir || element.closest("[dir]")?.getAttribute("dir");
  return dir === "rtl" ? "rtl" : "ltr";
}
