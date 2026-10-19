import {
  applyMoveIntentToIds,
  buildMoveIntent,
  DndProvider,
  type MoveIntent,
  useDndContext,
  useSortable,
  useSortableContainer,
} from "@kamod-ch/dnd";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  cellsBelow,
  gridIndexNeighbors,
  indexForLogicalEdge,
  projectPointer,
  type Axis,
  type Direction,
  type LogicalEdge,
} from "./strategy.js";

type Row = { id: string; label: string };
type Lists = Record<string, string[]>;

const HORIZONTAL = new Set(["ltr", "rtl", "left", "right", "strip"]);

const UNIFORM = [
  { id: "g-a", column: 0, row: 0 },
  { id: "g-b", column: 1, row: 0 },
  { id: "g-c", column: 0, row: 1 },
  { id: "g-d", column: 1, row: 1 },
];

const SPANNED = [
  { id: "wide", column: 0, row: 0, colSpan: 2 },
  { id: "span-left", column: 0, row: 1 },
  { id: "span-right", column: 1, row: 1 },
];

function ids(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}`);
}

function directionOf(containerId: string): Direction {
  return containerId === "rtl" ? "rtl" : "ltr";
}

function App() {
  const rows = useRef(new Map<string, Row>());
  const [lists, setLists] = useState<Lists>(() => {
    const next: Lists = {
      ltr: ["ltr-a", "ltr-b", "ltr-c"],
      rtl: ["rtl-a", "rtl-b", "rtl-c"],
      vertical: ["v-a", "v-b", "v-c"],
      empty: [],
      left: ["left-a", "left-b"],
      right: ["right-a"],
      strip: ids("strip-", 12),
      grid: UNIFORM.map((cell) => cell.id),
      variable: SPANNED.map((cell) => cell.id),
    };
    for (const list of Object.values(next)) {
      for (const id of list) rows.current.set(id, { id, label: id });
    }
    return next;
  });
  const listsRef = useRef(lists);
  listsRef.current = lists;
  const pointRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState("none");
  const [adapter, setAdapter] = useState("none");

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    // Production scrollRef registers auto-scroll 2.x, which listens on the
    // pragmatic 1.x monitor. Drags are dispatched by pragmatic 4, so that
    // registration never receives frames. This spike binds auto-scroll 3.x,
    // which shares that monitor, to measure horizontal edge scrolling.
    return autoScrollForElements({ element });
  }, []);

  useEffect(() => {
    const onDragStart = () => {
      draggingRef.current = true;
    };
    const onDragEnd = () => {
      draggingRef.current = false;
    };
    const remember = (event: { clientX: number; clientY: number }) => {
      pointRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("dragstart", onDragStart);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("dragover", remember);
    window.addEventListener("pointermove", remember);
    return () => {
      window.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("dragover", remember);
      window.removeEventListener("pointermove", remember);
    };
  }, []);

  const onMove = (intent: MoveIntent<Row>) => {
    setEngine(`${intent.itemId} -> ${intent.targetContainerId}@${intent.targetIndex}`);
    let applied = intent;
    if (draggingRef.current && HORIZONTAL.has(intent.targetContainerId) && pointRef.current) {
      const targetIds = listsRef.current[intent.targetContainerId] ?? [];
      const rects: Record<string, { left: number; top: number; right: number; bottom: number }> =
        {};
      for (const id of targetIds) {
        const element = document.querySelector(`[data-item='${id}']`);
        const box = element?.getBoundingClientRect();
        if (!box) continue;
        rects[id] = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      }
      const projected = projectPointer({
        ids: targetIds,
        rects,
        point: pointRef.current,
        axis: "horizontal",
        direction: directionOf(intent.targetContainerId),
        activeId: intent.itemId,
        sameContainer: intent.sourceContainerId === intent.targetContainerId,
      });
      applied = { ...intent, targetIndex: projected.index };
      setAdapter(
        `${intent.itemId} -> ${intent.targetContainerId}@${projected.index} ${projected.logical}`,
      );
    }
    setLists((prev) => applyMoveIntentToIds(prev, applied) as Lists);
    return true;
  };

  return (
    <DndProvider<Row> onMove={onMove} scrollRef={scrollRef} getItemLabel={(_id, row) => row.label}>
      <main style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 data-testid="title">Layout strategy spike</h1>
        <p data-testid="engine-intent">Engine: {engine}</p>
        <p data-testid="adapter-intent">Adapter: {adapter}</p>
        <p data-testid="order-ltr">LTR: {lists.ltr.join(",")}</p>
        <p data-testid="order-rtl">RTL: {lists.rtl.join(",")}</p>
        <p data-testid="order-vertical">Vertical: {lists.vertical.join(",")}</p>
        <p data-testid="order-empty">Empty: {lists.empty.join(",") || "none"}</p>
        <p data-testid="order-right">Right: {lists.right.join(",")}</p>
        <section>
          <h2>Horizontal LTR</h2>
          <Bar containerId="ltr" ids={lists.ltr} rows={rows.current} direction="ltr" />
        </section>
        <section dir="rtl">
          <h2>Horizontal RTL</h2>
          <Bar containerId="rtl" ids={lists.rtl} rows={rows.current} direction="rtl" />
        </section>
        <section>
          <h2>Vertical</h2>
          <Stack containerId="vertical" ids={lists.vertical} rows={rows.current} />
        </section>
        <section style={{ display: "flex", gap: 16 }}>
          <div>
            <h2>Transfer source</h2>
            <Bar containerId="left" ids={lists.left} rows={rows.current} direction="ltr" />
          </div>
          <div>
            <h2>Transfer target</h2>
            <Bar containerId="right" ids={lists.right} rows={rows.current} direction="ltr" />
            <EmptyList ids={lists.empty} />
          </div>
        </section>
        <section>
          <h2>Horizontal scroll</h2>
          <div
            ref={scrollRef}
            data-testid="scroll-strip"
            style={{ width: 220, overflowX: "auto", border: "1px solid #ccc" }}
          >
            <Bar containerId="strip" ids={lists.strip} rows={rows.current} direction="ltr" />
          </div>
        </section>
        <section>
          <h2>Uniform grid</h2>
          <Grid cells={UNIFORM} />
        </section>
        <section>
          <h2>Variable grid</h2>
          <Grid cells={SPANNED} />
        </section>
      </main>
    </DndProvider>
  );
}

function Bar({
  containerId,
  ids: itemIds,
  rows,
  direction,
}: {
  containerId: string;
  ids: string[];
  rows: Map<string, Row>;
  direction: Direction;
}) {
  const { ref } = useSortableContainer({ id: containerId, itemIds });
  return (
    <div
      ref={ref}
      data-testid={`bar-${containerId}`}
      dir={direction}
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        width: itemIds.length * 200,
        gap: 8,
        minHeight: 64,
      }}
    >
      {itemIds.map((id) => (
        <Item key={id} id={id} containerId={containerId} row={rows.get(id)!} axis="horizontal" />
      ))}
    </div>
  );
}

function Stack({
  containerId,
  ids: itemIds,
  rows,
}: {
  containerId: string;
  ids: string[];
  rows: Map<string, Row>;
}) {
  const { ref } = useSortableContainer({ id: containerId, itemIds });
  return (
    <div
      ref={ref}
      data-testid="bar-vertical"
      style={{ display: "flex", flexDirection: "column", width: 220, gap: 8 }}
    >
      {itemIds.map((id) => (
        <Item key={id} id={id} containerId={containerId} row={rows.get(id)!} axis="vertical" />
      ))}
    </div>
  );
}

function EmptyList({ ids: itemIds }: { ids: string[] }) {
  const { ref } = useSortableContainer({ id: "empty", itemIds });
  return (
    <div
      ref={ref}
      data-testid="empty-list"
      style={{ minWidth: 180, minHeight: 64, border: "1px dashed #888", marginTop: 8 }}
    >
      Empty
      {itemIds.map((id) => (
        <span key={id} data-testid={`empty-${id}`}>
          {id}
        </span>
      ))}
    </div>
  );
}

function Item({
  id,
  containerId,
  row,
  axis,
}: {
  id: string;
  containerId: string;
  row: Row;
  axis: Axis;
}) {
  const { itemRef, handleRef } = useSortable({ id, containerId, data: row });
  return (
    <div
      ref={itemRef}
      data-item={id}
      data-testid={`item-${id}`}
      style={{
        minWidth: axis === "horizontal" ? 140 : undefined,
        flexShrink: 0,
        minHeight: 56,
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: 8,
        border: "1px solid #ccc",
        background: "#fff",
      }}
    >
      <button
        ref={handleRef}
        type="button"
        data-testid={`handle-${id}`}
        style={{ touchAction: "none" }}
      >
        ⠿
      </button>
      <span>{row.label}</span>
      <LogicalMove containerId={containerId} itemId={id} row={row} edge="before" />
      <LogicalMove containerId={containerId} itemId={id} row={row} edge="after" />
    </div>
  );
}

function LogicalMove({
  containerId,
  itemId,
  row,
  edge,
}: {
  containerId: string;
  itemId: string;
  row: Row;
  edge: LogicalEdge;
}) {
  const { controller } = useDndContext<Row>();
  return (
    <button
      type="button"
      data-testid={`${edge}-${itemId}`}
      onClick={() => {
        const order = controller.getContainerIds(containerId);
        const index = order.indexOf(itemId);
        const neighbor = edge === "before" ? order[index - 1] : order[index + 1];
        if (!neighbor) return;
        const targetIndex = indexForLogicalEdge(order, itemId, neighbor, edge, true);
        controller.tryCommitMove(
          buildMoveIntent({
            itemId,
            sourceContainerId: containerId,
            targetContainerId: containerId,
            targetIndex,
            data: row,
          }),
        );
      }}
    >
      {edge}
    </button>
  );
}

function Grid({
  cells,
}: {
  cells: readonly { id: string; column: number; row: number; colSpan?: number }[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px 80px", width: 176, gap: 4 }}>
      {cells.map((cell) => {
        const neighbors = gridIndexNeighbors(cells, cell.id);
        const below = cellsBelow(cells, cell.id);
        return (
          <div
            key={cell.id}
            data-testid={`cell-${cell.id}`}
            data-after={neighbors.after ?? "none"}
            data-below={below.join(",") || "none"}
            style={{
              gridColumn: `${cell.column + 1} / span ${cell.colSpan ?? 1}`,
              minHeight: 48,
              border: "1px solid #999",
              padding: 4,
            }}
          >
            {cell.id}
          </div>
        );
      })}
    </div>
  );
}

render(<App />, document.getElementById("app")!);
