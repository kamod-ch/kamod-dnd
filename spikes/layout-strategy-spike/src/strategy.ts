import { indexAfterRemoval } from "@kamod-ch/dnd";

export type Axis = "vertical" | "horizontal";
export type Direction = "ltr" | "rtl";
export type LogicalEdge = "before" | "after";
export type PhysicalEdge = "top" | "bottom" | "left" | "right";

/** Lists stay in source order. RTL changes which physical side is "before". */
export function physicalEdge(axis: Axis, direction: Direction, logical: LogicalEdge): PhysicalEdge {
  if (axis === "vertical") return logical === "before" ? "top" : "bottom";
  if (direction === "ltr") return logical === "before" ? "left" : "right";
  return logical === "before" ? "right" : "left";
}

export function logicalEdgeFromPhysical(
  axis: Axis,
  direction: Direction,
  physical: PhysicalEdge,
): LogicalEdge | null {
  const before = physicalEdge(axis, direction, "before");
  const after = physicalEdge(axis, direction, "after");
  if (physical === before) return "before";
  if (physical === after) return "after";
  return null;
}

export function indexForLogicalEdge(
  ids: readonly string[],
  activeId: string,
  overId: string | null,
  logical: LogicalEdge,
  sameContainer: boolean,
): number {
  const edge = logical === "before" ? "top" : "bottom";
  return indexAfterRemoval(ids, ids, activeId, overId, edge, sameContainer);
}

export type Rect = { left: number; top: number; right: number; bottom: number };

export function projectPointer(args: {
  ids: readonly string[];
  rects: Readonly<Record<string, Rect>>;
  point: { x: number; y: number };
  axis: Axis;
  direction: Direction;
  activeId: string;
  sameContainer: boolean;
}): { overId: string | null; logical: LogicalEdge; index: number } {
  let overId: string | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const id of args.ids) {
    if (id === args.activeId) continue;
    const rect = args.rects[id];
    if (!rect) continue;
    const contains =
      args.point.x >= rect.left &&
      args.point.x <= rect.right &&
      args.point.y >= rect.top &&
      args.point.y <= rect.bottom;
    if (contains) {
      overId = id;
      break;
    }
    const dx = args.point.x - (rect.left + rect.right) / 2;
    const dy = args.point.y - (rect.top + rect.bottom) / 2;
    const distance = args.axis === "horizontal" ? Math.abs(dx) : Math.abs(dy);
    if (distance < best) {
      best = distance;
      overId = id;
    }
  }
  if (!overId) {
    return {
      overId: null,
      logical: "after",
      index: indexForLogicalEdge(args.ids, args.activeId, null, "after", args.sameContainer),
    };
  }
  const rect = args.rects[overId]!;
  const before = physicalEdge(args.axis, args.direction, "before");
  const midX = (rect.left + rect.right) / 2;
  const midY = (rect.top + rect.bottom) / 2;
  const onBeforeSide =
    before === "left"
      ? args.point.x <= midX
      : before === "right"
        ? args.point.x >= midX
        : before === "top"
          ? args.point.y <= midY
          : args.point.y >= midY;
  const logical: LogicalEdge = onBeforeSide ? "before" : "after";
  return {
    overId,
    logical,
    index: indexForLogicalEdge(args.ids, args.activeId, overId, logical, args.sameContainer),
  };
}

export type GridCell = {
  id: string;
  column: number;
  row: number;
  colSpan?: number;
};

/** Row-major index. Variable spans make the visual neighbor differ from index+1. */
export function gridIndexNeighbors(
  cells: readonly GridCell[],
  id: string,
): {
  after: string | null;
  below: string | null;
} {
  const index = cells.findIndex((cell) => cell.id === id);
  const cell = cells[index];
  if (!cell) return { after: null, below: null };
  const after = cells[index + 1] ?? null;
  const below =
    cells.find((candidate) => candidate.column === cell.column && candidate.row === cell.row + 1) ??
    null;
  return { after: after?.id ?? null, below: below?.id ?? null };
}

export function cellsBelow(cells: readonly GridCell[], id: string): string[] {
  const cell = cells.find((candidate) => candidate.id === id);
  if (!cell) return [];
  const span = cell.colSpan ?? 1;
  const columns = new Set<number>();
  for (let column = cell.column; column < cell.column + span; column += 1) columns.add(column);
  return cells
    .filter((candidate) => candidate.row === cell.row + 1 && columns.has(candidate.column))
    .map((candidate) => candidate.id);
}
