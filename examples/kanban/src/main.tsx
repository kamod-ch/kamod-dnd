import "@kamod-ch/themes/theme.css";
import { DndProvider } from "@kamod-ch/dnd";
import type { DropRuleContext, MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { Button } from "@kamod-ch/ui/button";
import { render } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";

type Card = { id: string; title: string; detail: string };

const columns = ["todo", "doing", "done"] as const;

const initial: Record<string, Card[]> = {
  todo: [
    { id: "c1", title: "Write spec", detail: "Short card" },
    { id: "c2", title: "Design API", detail: "Taller description\nwith two lines." },
    { id: "c4", title: "blocked release", detail: "Drop rule test card" },
  ],
  doing: [{ id: "c3", title: "Build spike", detail: "In progress" }],
  done: [],
};

function App() {
  const [lists, setLists] = useState(initial);
  const [, setHistory] = useState<Record<string, string[]>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const orders = useMemo(
    () => ({
      todo: lists.todo.map((c) => c.id),
      doing: lists.doing.map((c) => c.id),
      done: lists.done.map((c) => c.id),
    }),
    [lists],
  );

  const dropRule = (ctx: DropRuleContext<Card>) => {
    if (ctx.targetContainerId === "done" && ctx.data.title.includes("blocked")) {
      return false;
    }
    return true;
  };

  const onMove = (intent: MoveIntent<Card>) => {
    setHistory((h) => [...h, orders]);
    const nextOrders = applyMoveIntentToIds(orders, intent);
    setLists((prev) => {
      const cards = new Map<string, Card>();
      for (const col of columns) {
        for (const c of prev[col]) cards.set(c.id, c);
      }
      const remap = (ids: string[]) => ids.map((id) => cards.get(id)!);
      return {
        todo: remap(nextOrders.todo),
        doing: remap(nextOrders.doing),
        done: remap(nextOrders.done),
      };
    });
    return true;
  };

  const undo = () => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setLists((current) => {
        const cards = new Map<string, Card>();
        for (const col of columns) {
          for (const c of current[col]) cards.set(c.id, c);
        }
        const remap = (ids: string[]) => ids.map((id) => cards.get(id)!);
        return {
          todo: remap(prev.todo),
          doing: remap(prev.doing),
          done: remap(prev.done),
        };
      });
      return h.slice(0, -1);
    });
  };

  return (
    <DndProvider<Card>
      onMove={onMove}
      dropRule={dropRule}
      scrollRef={scrollRef}
      getItemLabel={(_id, card) => card.title}
      getContainerLabel={(id) =>
        id === "todo" ? "To do" : id === "doing" ? "Doing" : id === "done" ? "Done" : id
      }
    >
      <div class="kp-theme" style={{ padding: 16 }}>
        <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 data-testid="kanban-title">Kanban</h1>
          <Button size="sm" onClick={undo} data-testid="undo-btn">
            Undo
          </Button>
        </header>
        <div
          ref={scrollRef}
          data-testid="kanban-board"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            alignItems: "start",
          }}
        >
          {columns.map((col) => (
            <KanbanColumn key={col} id={col} cards={lists[col]} itemIds={orders[col]} />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}

function KanbanColumn({ id, cards, itemIds }: { id: string; cards: Card[]; itemIds: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id, itemIds });
  return (
    <section
      ref={ref}
      data-testid={`column-${id}`}
      style={{
        minHeight: 200,
        padding: 8,
        borderRadius: 8,
        background: "var(--kp-color-muted, #f4f4f5)",
      }}
    >
      <h2 style={{ fontSize: 14, textTransform: "uppercase", marginBottom: 8 }}>{id}</h2>
      {cards.length === 0 && (
        <p data-testid={`empty-${id}`} style={{ color: "#666", fontSize: 13 }}>
          Drop cards here
        </p>
      )}
      {cards.map((card, index) => (
        <KanbanCard key={card.id} card={card} columnId={id} showMarker={previewIndex === index} />
      ))}
    </section>
  );
}

function KanbanCard({
  card,
  columnId,
  showMarker,
}: {
  card: Card;
  columnId: string;
  showMarker?: boolean;
}) {
  const { itemRef, handleRef, isDragging, moveByKeyboard } = useSortable({
    id: card.id,
    containerId: columnId,
    data: card,
  });

  return (
    <>
      {showMarker && (
        <div data-testid={`marker-${card.id}`} style={{ height: 2, background: "#2563eb" }} />
      )}
      <article
        ref={itemRef}
        data-testid={`card-${card.id}`}
        style={{
          background: "var(--kp-color-surface, #fff)",
          border: "1px solid var(--kp-color-border, #ddd)",
          borderRadius: 8,
          padding: 10,
          marginBottom: 8,
          opacity: isDragging ? 0.6 : 1,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button
            ref={handleRef}
            type="button"
            data-testid={`handle-${card.id}`}
            aria-label={`Drag ${card.title}`}
            style={{ touchAction: "none", cursor: "grab" }}
          >
            ⠿
          </button>
          <div style={{ flex: 1 }}>
            <strong>{card.title}</strong>
            <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontSize: 13 }}>{card.detail}</p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => moveByKeyboard({ type: "up" })}>
            Up
          </Button>
          <Button size="sm" variant="ghost" onClick={() => moveByKeyboard({ type: "down" })}>
            Down
          </Button>
          {columns
            .filter((c) => c !== columnId)
            .map((target) => (
              <Button
                key={target}
                size="sm"
                variant="outline"
                data-testid={`move-${card.id}-to-${target}`}
                onClick={() => moveByKeyboard({ type: "transfer", targetContainerId: target })}
              >
                → {target}
              </Button>
            ))}
        </div>
      </article>
    </>
  );
}

render(<App />, document.getElementById("app")!);
