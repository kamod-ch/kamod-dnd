import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { render } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";

type Row = { id: string; label: string };

declare global {
  interface Window {
    __DND_PERF__?: {
      getRowRenders: () => number;
      resetRowRenders: () => void;
      getLongTasksMs: () => number[];
      resetLongTasks: () => void;
    };
  }
}

let rowRenderCount = 0;
const longTaskDurations: number[] = [];

if (typeof PerformanceObserver !== "undefined") {
  try {
    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) longTaskDurations.push(entry.duration);
      }
    });
    obs.observe({ type: "longtask", buffered: true });
  } catch {
    /* longtask not supported */
  }
}

window.__DND_PERF__ = {
  getRowRenders: () => rowRenderCount,
  resetRowRenders: () => {
    rowRenderCount = 0;
  },
  getLongTasksMs: () => [...longTaskDurations],
  resetLongTasks: () => {
    longTaskDurations.length = 0;
  },
};

function App() {
  const params = new URLSearchParams(window.location.search);
  const count = Number(params.get("count") ?? "100");
  const initial = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `row-${i}`,
        label: `Item ${i}`,
      })),
    [count],
  );
  const [order, setOrder] = useState(() => initial.map((r) => r.id));
  const scrollRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => new Map(initial.map((r) => [r.id, r])), [initial]);

  const onMove = (intent: MoveIntent<Row>) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    return true;
  };

  return (
    <DndProvider<Row> onMove={onMove} scrollRef={scrollRef}>
      <div
        ref={scrollRef}
        data-testid="perf-scroll"
        style={{ height: 480, overflow: "auto", padding: 8, fontFamily: "system-ui" }}
      >
        <PerfList order={order} byId={byId} />
      </div>
    </DndProvider>
  );
}

function PerfList({ order, byId }: { order: string[]; byId: Map<string, Row> }) {
  const { ref } = useSortableContainer({ id: "list", itemIds: order });
  return (
    <div ref={ref} data-testid="perf-list">
      {order.map((id) => {
        const row = byId.get(id);
        if (!row) return null;
        return <PerfRow key={id} row={row} />;
      })}
    </div>
  );
}

function PerfRow({ row }: { row: Row }) {
  rowRenderCount += 1;
  const { itemRef, handleRef } = useSortable({
    id: row.id,
    containerId: "list",
    data: row,
  });
  return (
    <div
      ref={itemRef}
      data-testid={`row-${row.id}`}
      style={{
        display: "flex",
        gap: 8,
        padding: "6px 8px",
        borderBottom: "1px solid #ddd",
        alignItems: "center",
      }}
    >
      <button
        ref={handleRef}
        type="button"
        data-testid={`handle-${row.id}`}
        style={{ touchAction: "none", cursor: "grab" }}
      >
        ⠿
      </button>
      <span>{row.label}</span>
    </div>
  );
}

render(<App />, document.getElementById("app")!);
