import { DndProvider, type DropRuleContext, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { useMemo, useRef, useState } from "preact/hooks";
import { DemoButton } from "../shared/DemoButton";

type Card = { id: string; title: string; detail: string };

const columns = ["todo", "doing", "done"] as const;

const initial: Record<string, Card[]> = {
  todo: [
    { id: "c1", title: "Write spec", detail: "Short card" },
    { id: "c2", title: "Design API", detail: "Taller description with two lines." },
    { id: "c4", title: "blocked release", detail: "Drop rule test card" },
  ],
  doing: [{ id: "c3", title: "Build spike", detail: "In progress" }],
  done: [],
};

export const kanbanDemoCode = `const dropRule = (ctx: DropRuleContext<Card>) => {
  if (ctx.targetContainerId === "done" && ctx.data.title.includes("blocked")) {
    return false;
  }
  return true;
};

const onMove = (intent: MoveIntent<Card>) => {
  setLists(/* remap cards from applyMoveIntentToIds(orders, intent) */);
  return true;
};

<DndProvider<Card> onMove={onMove} dropRule={dropRule} scrollRef={scrollRef}>
  {columns.map((col) => (
    <KanbanColumn key={col} id={col} cards={lists[col]} itemIds={orders[col]} />
  ))}
</DndProvider>`;

export function KanbanDemo(): JSX.Element {
  const [lists, setLists] = useState(initial);
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

  return (
    <div class="kp-theme w-full">
      <DndProvider<Card> onMove={onMove} dropRule={dropRule} scrollRef={scrollRef}>
        <div ref={scrollRef} class="grid gap-3 sm:grid-cols-3" style={{ alignItems: "start" }}>
          {columns.map((col) => (
            <KanbanColumn key={col} id={col} cards={lists[col]} itemIds={orders[col]} />
          ))}
        </div>
      </DndProvider>
    </div>
  );
}

function KanbanColumn({ id, cards, itemIds }: { id: string; cards: Card[]; itemIds: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id, itemIds });
  return (
    <section ref={ref} class="min-h-[12rem] rounded-lg border border-border bg-muted/50 p-2">
      <h2 class="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{id}</h2>
      {cards.length === 0 ? <p class="text-xs text-muted-foreground">Drop cards here</p> : null}
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
      {showMarker ? <div class="mb-1 h-0.5 rounded bg-brand" /> : null}
      <article
        ref={itemRef}
        class="mb-2 rounded-lg border border-border bg-card p-2.5 shadow-sm"
        style={{ opacity: isDragging ? 0.6 : 1 }}
      >
        <div class="flex gap-2">
          <button
            ref={handleRef}
            type="button"
            aria-label={`Drag ${card.title}`}
            class="text-muted-foreground"
            style={{ touchAction: "none", cursor: "grab" }}
          >
            ⠿
          </button>
          <div class="min-w-0 flex-1">
            <strong class="text-sm">{card.title}</strong>
            <p class="mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{card.detail}</p>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap gap-1">
          <DemoButton onClick={() => moveByKeyboard({ type: "up" })}>Up</DemoButton>
          <DemoButton onClick={() => moveByKeyboard({ type: "down" })}>Down</DemoButton>
          {columns
            .filter((c) => c !== columnId)
            .map((target) => (
              <DemoButton
                key={target}
                variant="outline"
                onClick={() => moveByKeyboard({ type: "transfer", targetContainerId: target })}
              >
                → {target}
              </DemoButton>
            ))}
        </div>
      </article>
    </>
  );
}
