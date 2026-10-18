/**
 * dnd-kit spike: uses @dnd-kit/core sensors only (no @dnd-kit/react).
 * DndContext and sortable presets target React; this spike validates Preact + core APIs.
 */
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { render } from "preact";
import { useState } from "preact/hooks";

type Item = { id: string; height: number; label: string };

const initialA: Item[] = [
  { id: "a1", height: 48, label: "Block A1" },
  { id: "a2", height: 96, label: "Tall A2" },
];

function SpikeApp() {
  const [items, setItems] = useState(initialA);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setItems(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <div style={{ fontFamily: "system-ui", padding: 16 }}>
        <h1 data-testid="spike-title">dnd-kit core spike</h1>
        <p>Minimal single-list reorder via @dnd-kit/sortable hooks on Preact.</p>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableRow key={item.id} item={item} />
          ))}
        </SortableContext>
        <DragOverlay />
      </div>
    </DndContext>
  );
}

function SortableRow({ item }: { item: Item }) {
  const { attributes, listeners, setNodeRef, transform, transition, setActivatorNodeRef } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: item.height,
    margin: "4px 0",
    border: "1px solid #333",
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "0 8px",
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`item-${item.id}`}>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...(listeners as unknown as Record<string, unknown>)}
        {...(attributes as unknown as Record<string, unknown>)}
        data-testid={`handle-${item.id}`}
        style={{ touchAction: "none" }}
      >
        ⠿
      </button>
      <span>{item.label}</span>
    </div>
  );
}

render(<SpikeApp />, document.getElementById("app")!);
