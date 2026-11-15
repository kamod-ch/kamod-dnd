import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { Fragment } from "preact";
import { useState } from "preact/hooks";
import { DragHandle, dragItemClass } from "../shared/DragHandle";
import { useDemoReset, useExampleFrame } from "../shared/ExampleFrame";
import { InsertionMarker } from "../shared/InsertionMarker";
import { formatMove } from "../shared/format-move";

const initialOrder = ["a", "b", "c"];

const labels: Record<string, string> = {
  a: "One",
  b: "Two",
  c: "Three",
};

export const horizontalListDemoCode = `import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { useState } from "preact/hooks";

export function HorizontalList() {
  const [order, setOrder] = useState(["a", "b", "c"]);

  const onMove = (intent: MoveIntent<{ id: string; label: string }>) => {
    setOrder((prev) => applyMoveIntentToIds({ chips: prev }, intent).chips);
    return true;
  };

  return (
    <DndProvider onMove={onMove} getItemLabel={(_, data) => data.label}>
      <HorizontalStrip order={order} />
    </DndProvider>
  );
}

function HorizontalStrip({ order }: { order: string[] }) {
  const { ref, previewIndex } = useSortableContainer({
    id: "chips",
    itemIds: order,
    orientation: "horizontal",
  });

  return (
    <div ref={ref} class="flex flex-nowrap gap-2 overflow-x-auto" dir="ltr">
      {order.map((id, index) => (
        <Chip key={id} id={id} showMarker={previewIndex === index} />
      ))}
      {previewIndex === order.length ? <div class="w-1 self-stretch rounded-full bg-brand" /> : null}
    </div>
  );
}

function Chip({ id, showMarker }: { id: string; showMarker?: boolean }) {
  const { itemRef, handleProps, isDragging } = useSortable({
    id,
    containerId: "chips",
    data: { id, label: id },
  });

  return (
    <>
      {showMarker ? <div class="w-1 self-stretch rounded-full bg-brand" aria-hidden="true" /> : null}
      <div ref={itemRef} data-dragging={isDragging ? "true" : "false"} class="flex items-center rounded-full border border-border bg-background pr-3">
        <button {...handleProps} aria-label={\`Drag \${id}\`} class="min-h-11 min-w-11">⠿</button>
        <span>{id}</span>
      </div>
    </>
  );
}

// Space or Enter picks up and drops. Arrow keys follow the horizontal axis.`;

export function HorizontalListDemo(): JSX.Element {
  const [order, setOrder] = useState(initialOrder);
  const { setNotice } = useExampleFrame();
  useDemoReset(() => setOrder(initialOrder));

  const onMove = (intent: MoveIntent<{ id: string; label: string }>) => {
    setOrder((prev) => applyMoveIntentToIds({ chips: prev }, intent).chips);
    setNotice({ tone: "move", text: formatMove(intent.data.label, intent) });
    return true;
  };

  return (
    <div class="w-full">
      <DndProvider onMove={onMove} getItemLabel={(_, data) => data.label}>
        <HorizontalStrip order={order} />
      </DndProvider>
    </div>
  );
}

function HorizontalStrip({ order }: { order: string[] }) {
  const { ref, previewIndex } = useSortableContainer({
    id: "chips",
    itemIds: order,
    orientation: "horizontal",
  });
  return (
    <div ref={ref} class="flex flex-nowrap items-stretch gap-2 overflow-x-auto pb-1" dir="ltr">
      {order.map((id, index) => (
        <Fragment key={id}>
          {previewIndex === index ? <InsertionMarker axis="x" /> : null}
          <Chip id={id} label={labels[id] ?? id} />
        </Fragment>
      ))}
      {previewIndex === order.length ? <InsertionMarker axis="x" /> : null}
    </div>
  );
}

function Chip({ id, label }: { id: string; label: string }) {
  const { itemRef, handleProps, isDragging } = useSortable({
    id,
    containerId: "chips",
    data: { id, label },
  });

  return (
    <div
      ref={itemRef}
      data-dragging={isDragging ? "true" : "false"}
      class={`flex items-center rounded-full border border-border bg-background pr-3 ${dragItemClass}`}
    >
      <DragHandle label={`Drag ${label}`} handleProps={handleProps} class="rounded-full" />
      <span class="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
