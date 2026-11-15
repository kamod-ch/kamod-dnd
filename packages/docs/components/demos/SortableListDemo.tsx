import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { Fragment } from "preact";
import { useState } from "preact/hooks";
import { DragHandle, dragItemClass } from "../shared/DragHandle";
import { useDemoReset, useExampleFrame } from "../shared/ExampleFrame";
import { InsertionMarker } from "../shared/InsertionMarker";
import { formatMove } from "../shared/format-move";

type TaskData = { id: string; label: string };

const initialOrder = ["a", "b", "c"];

const labels: Record<string, string> = {
  a: "Alpha task",
  b: "Beta task",
  c: "Gamma task",
};

export const sortableListDemoCode = `import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { useState } from "preact/hooks";

const labels: Record<string, string> = {
  a: "Alpha task",
  b: "Beta task",
  c: "Gamma task",
};

export function SortableList() {
  const [order, setOrder] = useState(["a", "b", "c"]);

  const onMove = (intent: MoveIntent<{ id: string; label: string }>) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    return true;
  };

  return (
    <DndProvider onMove={onMove} getItemLabel={(_, data) => data.label}>
      <SortableListBody order={order} />
    </DndProvider>
  );
}

function SortableListBody({ order }: { order: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id: "list", itemIds: order });
  return (
    <div ref={ref} class="flex flex-col gap-2">
      {order.map((id, index) => (
        <SortableRow key={id} id={id} label={labels[id] ?? id} showMarker={previewIndex === index} />
      ))}
      {previewIndex === order.length ? <div class="h-1 rounded-full bg-brand" /> : null}
    </div>
  );
}

function SortableRow({ id, label, showMarker }: { id: string; label: string; showMarker?: boolean }) {
  const { itemRef, handleProps, isDragging } = useSortable({
    id,
    containerId: "list",
    data: { id, label },
  });

  return (
    <>
      {showMarker ? <div class="h-1 rounded-full bg-brand" aria-hidden="true" /> : null}
      <div ref={itemRef} data-dragging={isDragging ? "true" : "false"} class="flex items-center gap-3 rounded-lg border border-border bg-background px-2 py-1">
        <button {...handleProps} aria-label={\`Drag \${label}\`} class="min-h-11 min-w-11">⠿</button>
        <span>{label}</span>
      </div>
    </>
  );
}`;

export function SortableListDemo(): JSX.Element {
  const [order, setOrder] = useState(initialOrder);
  const { setNotice } = useExampleFrame();
  useDemoReset(() => setOrder(initialOrder));

  const onMove = (intent: MoveIntent<TaskData>) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    setNotice({ tone: "move", text: formatMove(intent.data.label, intent) });
    return true;
  };

  return (
    <div class="w-full max-w-md">
      <DndProvider<TaskData> onMove={onMove} getItemLabel={(_, data) => data.label}>
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
        <Fragment key={id}>
          {previewIndex === index ? <InsertionMarker /> : null}
          <SortableRow id={id} label={labels[id] ?? id} />
        </Fragment>
      ))}
      {previewIndex === order.length ? <InsertionMarker /> : null}
    </div>
  );
}

function SortableRow({ id, label }: { id: string; label: string }) {
  const { itemRef, handleProps, isDragging } = useSortable({
    id,
    containerId: "list",
    data: { id, label },
  });

  return (
    <div
      ref={itemRef}
      data-dragging={isDragging ? "true" : "false"}
      class={`flex items-center gap-2 rounded-lg border border-border bg-background py-1 pr-3 pl-1 ${dragItemClass}`}
    >
      <DragHandle label={`Drag ${label}`} handleProps={handleProps} />
      <span class="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
