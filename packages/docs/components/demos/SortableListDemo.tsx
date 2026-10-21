import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { useState } from "preact/hooks";

type TaskData = { id: string; label: string };

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
    <DndProvider
      onMove={onMove}
      getItemLabel={(_, data) => data.label}
    >
      <SortableListBody order={order} />
    </DndProvider>
  );
}

function SortableListBody({ order }: { order: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id: "list", itemIds: order });
  return (
    <ul ref={ref} class="flex list-none flex-col gap-2 p-0">
      {order.map((id, index) => (
        <SortableRow key={id} id={id} showMarker={previewIndex === index} />
      ))}
    </ul>
  );
}

function SortableRow({ id, showMarker }: { id: string; showMarker?: boolean }) {
  const { itemRef, handleRef, isDragging } = useSortable({
    id,
    containerId: "list",
    data: { id, label: id },
  });

  return (
    <li class="list-none">
      {showMarker ? <div class="h-0.5 shrink-0 rounded bg-brand" aria-hidden="true" /> : null}
      <div
        ref={itemRef}
        class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
        style={{ opacity: isDragging ? 0.55 : 1 }}
      >
        <button ref={handleRef} type="button" aria-label={\`Drag \${id}\`} style={{ cursor: "grab" }}>
          ⠿
        </button>
        <span>{id}</span>
      </div>
    </li>
  );
}`;

export function SortableListDemo(): JSX.Element {
  const [order, setOrder] = useState(["a", "b", "c"]);

  const onMove = (intent: MoveIntent<TaskData>) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    return true;
  };

  return (
    <div class="kp-theme w-full max-w-md">
      <DndProvider<TaskData>
        onMove={onMove}
        getItemLabel={(_, data) => data.label}
      >
        <SortableListBody order={order} />
      </DndProvider>
    </div>
  );
}

function SortableListBody({ order }: { order: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id: "list", itemIds: order });
  return (
    <div ref={ref} class="flex flex-col gap-2">
      {order.map((id, index) => (
        <SortableRow
          key={id}
          id={id}
          label={labels[id] ?? id}
          showMarker={previewIndex === index}
        />
      ))}
    </div>
  );
}

function SortableRow({
  id,
  label,
  showMarker,
}: {
  id: string;
  label: string;
  showMarker?: boolean;
}) {
  const { itemRef, handleProps, isDragging } = useSortable({
    id,
    containerId: "list",
    data: { id, label },
  });

  return (
    <>
      {showMarker ? <div class="h-0.5 shrink-0 rounded bg-brand" aria-hidden="true" /> : null}
      <div
        ref={itemRef}
        class="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 shadow-sm"
        style={{ opacity: isDragging ? 0.55 : 1 }}
      >
        <button {...handleProps} aria-label={`Drag ${label}`} class="text-muted-foreground">
          ⠿
        </button>
        <span class="text-sm font-medium text-foreground">{label}</span>
      </div>
    </>
  );
}
