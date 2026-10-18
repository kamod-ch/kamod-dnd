import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";

type Item = { id: string; height: number; label: string };

const initialA: Item[] = [
  { id: "a1", height: 48, label: "Block A1" },
  { id: "a2", height: 96, label: "Tall A2" },
  { id: "a3", height: 56, label: "Block A3" },
];
const initialB: Item[] = [];

function SpikeApp() {
  const [listA, setListA] = useState(initialA);
  const [listB, setListB] = useState<Item[]>(initialB);
  const [log, setLog] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const pushLog = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 8));

  useEffect(() => {
    return monitorForElements({
      onDragStart: ({ source }) => {
        pushLog(`drag start ${String(source.data.id)}`);
      },
      onDrop: ({ source, location }) => {
        const sourceId = String(source.data.id);
        const sourceList = String(source.data.listId);
        const target = location.current.dropTargets[0];
        if (!target) {
          pushLog("drop cancelled (no target)");
          return;
        }
        const targetId = target.data.id ? String(target.data.id) : null;
        const targetList = String(target.data.listId);
        const edge = extractClosestEdge(target.data);

        const moveBetween = (
          from: Item[],
          to: Item[],
          setFrom: (v: Item[]) => void,
          setTo: (v: Item[]) => void,
        ) => {
          const fromIdx = from.findIndex((i) => i.id === sourceId);
          if (fromIdx < 0) return;
          const [item] = from.splice(fromIdx, 1);
          let insertAt = to.length;
          if (targetId) {
            const tIdx = to.findIndex((i) => i.id === targetId);
            if (tIdx >= 0) insertAt = edge === "bottom" ? tIdx + 1 : tIdx;
          }
          const nextTo = [...to];
          nextTo.splice(insertAt, 0, item);
          setFrom([...from]);
          setTo(nextTo);
          pushLog(`dropped ${sourceId} → ${targetList}@${insertAt}`);
        };

        if (sourceList === "a" && targetList === "a") {
          const idx = listA.findIndex((i) => i.id === sourceId);
          const overIdx = targetId ? listA.findIndex((i) => i.id === targetId) : listA.length - 1;
          if (idx >= 0 && overIdx >= 0) {
            setListA(reorder({ list: listA, startIndex: idx, finishIndex: overIdx }));
            pushLog("reorder A");
          }
          return;
        }
        if (sourceList === "a" && targetList === "b") {
          moveBetween([...listA], [...listB], setListA, setListB);
          return;
        }
        if (sourceList === "b" && targetList === "a") {
          moveBetween([...listB], [...listA], setListB, setListA);
          return;
        }
        if (sourceList === "b" && targetList === "b") {
          const idx = listB.findIndex((i) => i.id === sourceId);
          const overIdx = targetId ? listB.findIndex((i) => i.id === targetId) : listB.length - 1;
          if (idx >= 0 && overIdx >= 0) {
            setListB(reorder({ list: listB, startIndex: idx, finishIndex: overIdx }));
            pushLog("reorder B");
          }
        }
      },
    });
  }, [listA, listB]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    return autoScrollForElements({ element: el });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") pushLog("escape (monitor continues)");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1 data-testid="spike-title">Pragmatic spike</h1>
      <p>
        Select text here: <strong>keep selection while not dragging handle</strong>
      </p>
      <label>
        Input: <input data-testid="sample-input" type="text" defaultValue="editable" />
      </label>
      <div
        contentEditable
        data-testid="sample-ce"
        style={{ border: "1px solid #ccc", padding: 8, minHeight: 40 }}
      >
        contenteditable area
      </div>
      <div
        ref={scrollRef}
        data-testid="scroll-container"
        style={{
          display: "flex",
          gap: 16,
          marginTop: 16,
          maxHeight: 280,
          overflow: "auto",
          border: "1px solid #ddd",
          padding: 8,
        }}
      >
        <ListColumn listId="a" title="List A" items={listA} />
        <ListColumn listId="b" title="List B (empty ok)" items={listB} empty />
      </div>
      <pre data-testid="log" style={{ fontSize: 12 }}>
        {log.join("\n")}
      </pre>
    </div>
  );
}

function ListColumn({
  listId,
  title,
  items,
  empty,
}: {
  listId: string;
  title: string;
  items: Item[];
  empty?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ listId, type: "container" }),
    });
  }, [listId]);

  return (
    <div style={{ flex: 1, minWidth: 160 }}>
      <h2>{title}</h2>
      <div
        ref={containerRef}
        data-testid={`list-${listId}`}
        style={{
          minHeight: 120,
          background: empty && items.length === 0 ? "#f5f5f5" : "#fff",
          padding: 4,
        }}
      >
        {items.length === 0 && (
          <div data-testid={`empty-${listId}`} style={{ color: "#888", padding: 8 }}>
            Drop here
          </div>
        )}
        {items.map((item) => (
          <SortableRow key={item.id} item={item} listId={listId} />
        ))}
      </div>
    </div>
  );
}

function SortableRow({ item, listId }: { item: Item; listId: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const row = rowRef.current;
    const handle = handleRef.current;
    if (!row || !handle) return;

    return combine(
      draggable({
        element: row,
        dragHandle: handle,
        getInitialData: () => ({ id: item.id, listId, type: "item" }),
      }),
      dropTargetForElements({
        element: row,
        getData: ({ input }) =>
          attachClosestEdge(
            { id: item.id, listId, type: "item" },
            {
              element: row,
              input,
              allowedEdges: ["top", "bottom"] as Edge[],
            },
          ),
      }),
    );
  }, [item.id, listId]);

  return (
    <div
      ref={rowRef}
      data-testid={`item-${item.id}`}
      style={{
        height: item.height,
        margin: "4px 0",
        border: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 8px",
        background: "#fafafa",
      }}
    >
      <button
        ref={handleRef}
        type="button"
        data-testid={`handle-${item.id}`}
        aria-label={`Drag ${item.label}`}
        style={{ touchAction: "none", cursor: "grab" }}
      >
        ⠿
      </button>
      <span>{item.label}</span>
    </div>
  );
}

render(<SpikeApp />, document.getElementById("app")!);
