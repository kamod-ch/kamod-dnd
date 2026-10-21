import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { useState } from "preact/hooks";

const labels: Record<string, string> = {
  a: "One",
  b: "Two",
  c: "Three",
};

export const horizontalListDemoCode = `useSortableContainer({
  id: "chips",
  itemIds: order,
  orientation: "horizontal",
});

// Handle: Space/Enter to pick up, arrows along the axis, Space/Enter to drop.`;

export function HorizontalListDemo(): JSX.Element {
  const [order, setOrder] = useState(["a", "b", "c"]);

  const onMove = (intent: MoveIntent) => {
    setOrder((prev) => applyMoveIntentToIds({ chips: prev }, intent).chips);
    return true;
  };

  return (
    <div class="kp-theme w-full max-w-xl">
      <DndProvider onMove={onMove}>
        <HorizontalStrip order={order} />
      </DndProvider>
    </div>
  );
}

function HorizontalStrip({ order }: { order: string[] }) {
  const { ref } = useSortableContainer({
    id: "chips",
    itemIds: order,
    orientation: "horizontal",
  });
  return (
    <div ref={ref} class="flex flex-wrap gap-2" dir="ltr">
      {order.map((id) => (
        <Chip key={id} id={id} label={labels[id] ?? id} />
      ))}
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
      class="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm"
      style={{ opacity: isDragging ? 0.55 : 1 }}
    >
      <button {...handleProps} aria-label={`Drag ${label}`} class="text-muted-foreground">
        ⠿
      </button>
      <span class="text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
