import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { useState } from "preact/hooks";

const labels: Record<string, string> = {
  a: "Alpha task",
  b: "Beta task",
  c: "Gamma task",
};

export const sortableListDemoCode = `import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { useState } from "preact/hooks";

export function SortableList() {
  const [order, setOrder] = useState(["a", "b", "c"]);

  const onMove = (intent: MoveIntent) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    return true;
  };

  return (
    <DndProvider onMove={onMove}>
      <SortableListBody order={order} />
    </DndProvider>
  );
}

function SortableListBody({ order }: { order: string[] }) {
  const { ref } = useSortableContainer({ id: "list", itemIds: order });
  return (
    <ul ref={ref} class="list-none space-y-2 p-0">
      {order.map((id) => (
        <SortableRow key={id} id={id} />
      ))}
    </ul>
  );
}

function SortableRow({ id }: { id: string }) {
  const { itemRef, handleRef, isDragging } = useSortable({
    id,
    containerId: "list",
    data: { id },
  });

  return (
    <li
      ref={itemRef}
      class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
      style={{ opacity: isDragging ? 0.55 : 1 }}
    >
      <button ref={handleRef} type="button" aria-label={\`Drag \${id}\`} style={{ cursor: "grab" }}>
        ⠿
      </button>
      <span>{id}</span>
    </li>
  );
}`;

export function SortableListDemo(): JSX.Element {
  const [order, setOrder] = useState(["a", "b", "c"]);

  const onMove = (intent: MoveIntent) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    return true;
  };

  return (
    <div class="kp-theme w-full max-w-md">
      <DndProvider onMove={onMove}>
        <SortableListBody order={order} />
      </DndProvider>
    </div>
  );
}

function SortableListBody({ order }: { order: string[] }) {
  const { ref } = useSortableContainer({ id: "list", itemIds: order });
  return (
    <div ref={ref} class="space-y-2">
      {order.map((id) => (
        <SortableRow key={id} id={id} label={labels[id] ?? id} />
      ))}
    </div>
  );
}

function SortableRow({ id, label }: { id: string; label: string }) {
  const { itemRef, handleRef, isDragging } = useSortable({
    id,
    containerId: "list",
    data: { id, label },
  });

  return (
    <div
      ref={itemRef}
      class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 shadow-sm"
      style={{ opacity: isDragging ? 0.55 : 1 }}
    >
      <button
        ref={handleRef}
        type="button"
        aria-label={`Drag ${label}`}
        class="text-muted-foreground"
        style={{ touchAction: "none", cursor: "grab" }}
      >
        ⠿
      </button>
      <span class="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
