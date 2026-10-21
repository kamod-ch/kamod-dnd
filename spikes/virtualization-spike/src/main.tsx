import {
  applyMoveIntentToIds,
  buildMoveIntent,
  DndProvider,
  type MoveIntent,
  useDndContext,
  useSortable,
  useSortableContainer,
} from "@kamod-ch/dnd";
import type { Virtualizer } from "@tanstack/virtual-core";
import { render } from "preact";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  indexAtOffset,
  offsetForIndex,
  rowHeight,
  unmountedDropGap,
  VIEWPORT_PX,
} from "./geometry.js";
import { useElementVirtualizer } from "./use-virtualizer.js";

type Row = { id: string; label: string };
type Lists = { main: string[]; side: string[]; empty: string[] };

declare global {
  interface Window {
    __VIRT__?: {
      getRowRenders: () => number;
      resetRowRenders: () => void;
      getLongTasksMs: () => number[];
      resetLongTasks: () => void;
    };
  }
}

let rowRenders = 0;
const longTaskDurations: number[] = [];

if (typeof PerformanceObserver !== "undefined") {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) longTaskDurations.push(entry.duration);
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    /* longtask is not available in every browser */
  }
}

window.__VIRT__ = {
  getRowRenders: () => rowRenders,
  resetRowRenders: () => {
    rowRenders = 0;
  },
  getLongTasksMs: () => [...longTaskDurations],
  resetLongTasks: () => {
    longTaskDurations.length = 0;
  },
};

function makeIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${index}`);
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const count = Number(params.get("count") ?? "10000");
  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const id of makeIds("row-", count)) map.set(id, { id, label: `Item ${id.slice(4)}` });
    for (const id of makeIds("side-", 40)) map.set(id, { id, label: `Side ${id.slice(5)}` });
    return map;
  }, [count]);
  const [lists, setLists] = useState<Lists>(() => ({
    main: makeIds("row-", count),
    side: makeIds("side-", 40),
    empty: [],
  }));
  const [lastIntent, setLastIntent] = useState("none");
  const [visible, setVisible] = useState(true);
  const [mountedMain, setMountedMain] = useState(0);
  const [gapMain, setGapMain] = useState("gap unavailable");
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainVirtualizer = useRef<Virtualizer<HTMLElement, Element> | null>(null);

  const onMove = (intent: MoveIntent<Row>) => {
    setLists((prev) => applyMoveIntentToIds(prev, intent) as Lists);
    setLastIntent(`${intent.itemId} -> ${intent.targetContainerId}@${intent.targetIndex}`);
    return true;
  };

  return (
    <DndProvider<Row> onMove={onMove} scrollRef={scrollRef} getItemLabel={(_id, row) => row.label}>
      <main style={{ fontFamily: "system-ui", padding: 16, display: "flex", gap: 24 }}>
        <section>
          <h1 data-testid="title">Virtual list</h1>
          {visible ? (
            <div
              ref={scrollRef}
              data-testid="scroll-main"
              style={{
                height: VIEWPORT_PX,
                overflow: "auto",
                width: 420,
                border: "1px solid #ccc",
              }}
            >
              <VirtualRows
                containerId="main"
                ids={lists.main}
                rows={rows}
                scrollRef={scrollRef}
                virtualizerRef={mainVirtualizer}
                showKeyboard
                onWindow={(mounted, gap) => {
                  setMountedMain((prev) => (prev === mounted ? prev : mounted));
                  setGapMain((prev) => (prev === gap ? prev : gap));
                }}
              />
            </div>
          ) : (
            <p data-testid="unmounted">unmounted</p>
          )}
          <p data-testid="last-intent">Last intent: {lastIntent}</p>
          <CancelNote />
          <p data-testid="index-row-0">Index row-0: {lists.main.indexOf("row-0")}</p>
          <p data-testid="index-row-1">Index row-1: {lists.main.indexOf("row-1")}</p>
          <p data-testid="empty-ids">Empty: {lists.empty.join(",") || "none"}</p>
          <p data-testid="side-ids">
            Side:{" "}
            {lists.side
              .filter((id) => id.startsWith("row-") || lists.side.indexOf(id) < 3)
              .join(",")}
          </p>
          <p data-testid="mounted-main">{mountedMain}</p>
          <p data-testid="gap-main">{gapMain}</p>
          <button type="button" data-testid="unmount" onClick={() => setVisible(false)}>
            Unmount
          </button>
          {visible ? (
            <JumpButton
              onJump={() => {
                mainVirtualizer.current?.scrollToIndex(
                  Math.min(500, Math.max(0, lists.main.length - 1)),
                  {
                    align: "start",
                  },
                );
              }}
            />
          ) : null}
        </section>
        <section>
          <h2>Second list</h2>
          <SideScroller ids={lists.side} rows={rows} />
          <EmptyList ids={lists.empty} />
        </section>
      </main>
    </DndProvider>
  );
}

function CancelNote() {
  const { controller } = useDndContext<Row>();
  const [reason, setReason] = useState("none");
  useEffect(() => {
    return controller.subscribe((event) => {
      if (event.type === "cancel") setReason(event.reason);
    });
  }, [controller]);
  return <p data-testid="cancel-reason">{reason}</p>;
}

function JumpButton({ onJump }: { onJump: () => void }) {
  const { controller } = useDndContext<Row>();
  return (
    <button
      type="button"
      data-testid="jump-row-0"
      onClick={() => {
        onJump();
        const rows = controller.getContainerIds("main");
        const item = rows.includes("row-0") ? "row-0" : null;
        if (!item) return;
        controller.tryCommitMove(
          buildMoveIntent({
            itemId: "row-0",
            sourceContainerId: "main",
            targetContainerId: "main",
            targetIndex: Math.min(500, Math.max(0, rows.length - 1)),
            data: { id: "row-0", label: "Item 0" },
          }),
        );
      }}
    >
      Move row-0 to index 500
    </button>
  );
}

function SideScroller({ ids, rows }: { ids: string[]; rows: Map<string, Row> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={scrollRef}
      data-testid="scroll-side"
      style={{ height: 180, overflow: "auto", width: 280, border: "1px solid #ccc" }}
    >
      <VirtualRows containerId="side" ids={ids} rows={rows} scrollRef={scrollRef} />
    </div>
  );
}

function EmptyList({ ids }: { ids: string[] }) {
  const { ref } = useSortableContainer({ id: "empty", itemIds: ids });
  return (
    <div
      ref={ref}
      data-testid="empty-list"
      style={{ minHeight: 72, marginTop: 12, border: "1px dashed #888", padding: 8 }}
    >
      Empty drop zone
      {ids.map((id) => (
        <p key={id} data-testid={`empty-${id}`}>
          {id}
        </p>
      ))}
    </div>
  );
}

function VirtualRows({
  containerId,
  ids,
  rows,
  scrollRef,
  virtualizerRef,
  showKeyboard = false,
  onWindow,
}: {
  containerId: string;
  ids: string[];
  rows: Map<string, Row>;
  scrollRef: { current: HTMLElement | null };
  virtualizerRef?: { current: Virtualizer<HTMLElement, Element> | null };
  showKeyboard?: boolean;
  onWindow?: (mounted: number, gap: string) => void;
}) {
  const getDropIndex = useMemo(() => {
    return (args: {
      containerId: string;
      clientX: number;
      clientY: number;
      itemIds: readonly string[];
      activeId: string;
    }) => {
      const scrollEl = scrollRef.current;
      if (!scrollEl) return args.itemIds.length;
      const rect = scrollEl.getBoundingClientRect();
      const offset = args.clientY - rect.top + scrollEl.scrollTop;
      return indexAtOffset(args.itemIds.length, offset);
    };
  }, [scrollRef]);

  const { ref } = useSortableContainer({
    id: containerId,
    itemIds: ids,
    getDropIndex: containerId === "main" ? getDropIndex : undefined,
  });
  const virtualizer = useElementVirtualizer({
    count: ids.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: rowHeight,
    getItemKey: (index) => ids[index] ?? String(index),
    overscan: 8,
  });
  if (virtualizerRef) virtualizerRef.current = virtualizer;
  const items = virtualizer.getVirtualItems();
  const range = virtualizer.range;
  const mounted = { start: range?.startIndex ?? 0, end: (range?.endIndex ?? -1) + 1 };
  const gap =
    containerId === "main" && ids.length > 500
      ? unmountedDropGap({
          ids,
          activeId: ids[0] ?? "row-0",
          pointerOffset: offsetForIndex(500),
          mounted,
        })
      : null;
  const onWindowRef = useRef(onWindow);
  onWindowRef.current = onWindow;
  useEffect(() => {
    onWindowRef.current?.(
      items.length,
      gap
        ? `visual ${gap.visualIndex} library ${gap.libraryIndex} destination-mounted ${gap.destinationMounted}`
        : "gap unavailable",
    );
  }, [items.length, gap?.visualIndex, gap?.libraryIndex, gap?.destinationMounted]);

  return (
    <div
      ref={ref}
      data-list={containerId}
      data-testid={`list-${containerId}`}
      style={{ height: virtualizer.getTotalSize(), position: "relative" }}
    >
      {items.map((item) => {
        const id = ids[item.index];
        const row = id ? rows.get(id) : undefined;
        if (!id || !row) return null;
        return (
          <VirtualRow
            key={id}
            row={row}
            containerId={containerId}
            index={item.index}
            start={item.start}
            virtualizer={virtualizer}
            showKeyboard={showKeyboard}
          />
        );
      })}
    </div>
  );
}

function VirtualRow({
  row,
  containerId,
  index,
  start,
  virtualizer,
  showKeyboard,
}: {
  row: Row;
  containerId: string;
  index: number;
  start: number;
  virtualizer: Virtualizer<HTMLElement, Element>;
  showKeyboard: boolean;
}) {
  rowRenders += 1;
  const { itemRef, handleRef, moveByKeyboard } = useSortable({
    id: row.id,
    containerId,
    data: row,
  });
  useLayoutEffect(() => {
    if (itemRef.current) virtualizer.measureElement(itemRef.current);
  });
  return (
    <div
      ref={itemRef}
      data-index={index}
      data-testid={`row-${row.id}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${start}px)`,
        height: rowHeight(index),
        display: "flex",
        gap: 8,
        alignItems: "center",
        boxSizing: "border-box",
        borderBottom: "1px solid #ddd",
        background: "#fff",
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
      {showKeyboard ? (
        <button
          type="button"
          data-testid={`kb-down-${row.id}`}
          onClick={() => moveByKeyboard({ type: "down" })}
        >
          Down
        </button>
      ) : null}
    </div>
  );
}

render(<App />, document.getElementById("app")!);
