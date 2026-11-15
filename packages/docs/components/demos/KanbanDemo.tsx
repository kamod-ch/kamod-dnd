import { DndProvider, useDndState, type DropRuleContext, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import type { JSX } from "preact";
import { Fragment } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { DragHandle, dragItemClass } from "../shared/DragHandle";
import { IDLE_NOTICE, useDemoReset, useExampleFrame } from "../shared/ExampleFrame";
import { InsertionMarker } from "../shared/InsertionMarker";
import { MoveMenu } from "../shared/MoveMenu";
import { formatMove } from "../shared/format-move";

type Card = { id: string; title: string; detail: string };

const columns = ["todo", "doing", "done"] as const;
type ColumnId = (typeof columns)[number];

const columnLabels: Record<ColumnId, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

const REJECTED = "rejected: blocked items cannot enter Done";

function createLists(): Record<ColumnId, Card[]> {
  return {
    todo: [
      { id: "c1", title: "Write spec", detail: "Short card" },
      { id: "c2", title: "Design API", detail: "Taller description with two lines." },
      { id: "c4", title: "blocked release", detail: "Drop rule test card" },
    ],
    doing: [{ id: "c3", title: "Build spike", detail: "In progress" }],
    done: [],
  };
}

export const kanbanDemoCode = `import { DndProvider, type DropRuleContext, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { useMemo, useState } from "preact/hooks";

type Card = { id: string; title: string; detail: string };
const columns = ["todo", "doing", "done"] as const;

export function Kanban() {
  const [lists, setLists] = useState({
    todo: [
      { id: "c1", title: "Write spec", detail: "Short card" },
      { id: "c4", title: "blocked release", detail: "Drop rule test card" },
    ],
    doing: [{ id: "c3", title: "Build spike", detail: "In progress" }],
    done: [] as Card[],
  });

  const orders = useMemo(
    () => ({
      todo: lists.todo.map((card) => card.id),
      doing: lists.doing.map((card) => card.id),
      done: lists.done.map((card) => card.id),
    }),
    [lists],
  );

  const dropRule = (ctx: DropRuleContext<Card>) =>
    !(ctx.targetContainerId === "done" && ctx.data.title.includes("blocked"));

  const onMove = (intent: MoveIntent<Card>) => {
    const nextOrders = applyMoveIntentToIds(orders, intent);
    setLists((prev) => {
      const cards = new Map<string, Card>();
      for (const column of columns) {
        for (const card of prev[column]) cards.set(card.id, card);
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
    <DndProvider onMove={onMove} dropRule={dropRule} getItemLabel={(_, card) => card.title}>
      <div class="grid gap-3 sm:grid-cols-3">
        {columns.map((column) => (
          <Column key={column} id={column} cards={lists[column]} itemIds={orders[column]} />
        ))}
      </div>
    </DndProvider>
  );
}

function Column({ id, cards, itemIds }: { id: string; cards: Card[]; itemIds: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id, itemIds });
  return (
    <section ref={ref}>
      {cards.map((card, index) => (
        <KanbanCard key={card.id} card={card} columnId={id} showMarker={previewIndex === index} />
      ))}
      {previewIndex === cards.length ? <div class="h-1 rounded-full bg-brand" /> : null}
    </section>
  );
}

function KanbanCard({ card, columnId, showMarker }: { card: Card; columnId: string; showMarker?: boolean }) {
  const { itemRef, handleProps, isDragging, moveByKeyboard } = useSortable({
    id: card.id,
    containerId: columnId,
    data: card,
  });

  return (
    <>
      {showMarker ? <div class="h-1 rounded-full bg-brand" aria-hidden="true" /> : null}
      <article ref={itemRef} data-dragging={isDragging ? "true" : "false"}>
        <button {...handleProps} aria-label={\`Drag \${card.title}\`} class="min-h-11 min-w-11">⠿</button>
        <strong>{card.title}</strong>
        <button type="button" onClick={() => moveByKeyboard({ type: "up" })}>Up</button>
        <button type="button" onClick={() => moveByKeyboard({ type: "down" })}>Down</button>
        <button type="button" onClick={() => moveByKeyboard({ type: "transfer", targetContainerId: "done" })}>
          To done
        </button>
      </article>
    </>
  );
}`;

export function KanbanDemo(): JSX.Element {
  const [lists, setLists] = useState(createLists);
  const { setNotice } = useExampleFrame();
  useDemoReset(() => setLists(createLists()));

  const orders = useMemo(
    () => ({
      todo: lists.todo.map((card) => card.id),
      doing: lists.doing.map((card) => card.id),
      done: lists.done.map((card) => card.id),
    }),
    [lists],
  );

  const dropRule = (ctx: DropRuleContext<Card>) =>
    !(ctx.targetContainerId === "done" && ctx.data.title.includes("blocked"));

  const onMove = (intent: MoveIntent<Card>) => {
    const nextOrders = applyMoveIntentToIds(orders, intent);
    setLists((prev) => {
      const cards = new Map<string, Card>();
      for (const column of columns) {
        for (const card of prev[column]) cards.set(card.id, card);
      }
      const remap = (ids: string[]) => ids.map((id) => cards.get(id)!);
      return {
        todo: remap(nextOrders.todo),
        doing: remap(nextOrders.doing),
        done: remap(nextOrders.done),
      };
    });
    setNotice({
      tone: "move",
      text: formatMove(intent.data.title, intent, (id) => columnLabels[id as ColumnId] ?? id),
    });
    return true;
  };

  return (
    <div class="w-full">
      <DndProvider<Card>
        onMove={onMove}
        dropRule={dropRule}
        getItemLabel={(_, card) => card.title}
        getContainerLabel={(id) => columnLabels[id as ColumnId] ?? id}
        onCancel={(reason) => {
          if (reason === "rejected") setNotice({ tone: "reject", text: REJECTED });
        }}
      >
        <RejectWatch />
        <div class="grid items-start gap-3 sm:grid-cols-3">
          {columns.map((column) => (
            <KanbanColumn key={column} id={column} cards={lists[column]} itemIds={orders[column]} />
          ))}
        </div>
      </DndProvider>
    </div>
  );
}

function RejectWatch(): null {
  const snap = useDndState<Card>();
  const { notice, setNotice } = useExampleFrame();

  useEffect(() => {
    if (snap.phase !== "dragging") return;
    const blocked = snap.overContainerId === "done" && !snap.canDrop;
    if (blocked) {
      if (notice.tone === "reject" && notice.text === REJECTED) return;
      setNotice({ tone: "reject", text: REJECTED });
      return;
    }
    if (notice.tone === "reject") setNotice(IDLE_NOTICE);
  }, [notice, setNotice, snap.canDrop, snap.overContainerId, snap.phase]);

  return null;
}

function KanbanColumn({ id, cards, itemIds }: { id: ColumnId; cards: Card[]; itemIds: string[] }) {
  const { ref, previewIndex } = useSortableContainer({ id, itemIds });
  const snap = useDndState<Card>();
  const rejected = snap.phase === "dragging" && snap.overContainerId === id && !snap.canDrop;

  return (
    <section
      ref={ref}
      data-reject={rejected ? "true" : "false"}
      class="min-h-48 rounded-lg border border-border bg-background/80 p-2 data-[reject=true]:border-brand data-[reject=true]:bg-muted"
    >
      <p class="m-0 mb-2 px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {columnLabels[id]}
      </p>
      {cards.length === 0 ? (
        <p class="m-0 px-1 text-xs text-muted-foreground">Drop cards here</p>
      ) : null}
      {cards.map((card, index) => (
        <Fragment key={card.id}>
          {previewIndex === index ? <InsertionMarker /> : null}
          <KanbanCard card={card} columnId={id} />
        </Fragment>
      ))}
      {previewIndex === cards.length ? <InsertionMarker /> : null}
    </section>
  );
}

function KanbanCard({ card, columnId }: { card: Card; columnId: ColumnId }) {
  const { setNotice } = useExampleFrame();
  const { itemRef, handleProps, isDragging, moveByKeyboard } = useSortable({
    id: card.id,
    containerId: columnId,
    data: card,
  });

  const transfer = (target: ColumnId) => {
    if (target === "done" && card.title.includes("blocked")) {
      setNotice({ tone: "reject", text: REJECTED });
      return;
    }
    moveByKeyboard({ type: "transfer", targetContainerId: target });
  };

  return (
    <article
      ref={itemRef}
      data-dragging={isDragging ? "true" : "false"}
      class={`mb-2 rounded-lg border border-border bg-card p-2 ${dragItemClass}`}
    >
      <div class="flex items-start gap-1">
        <DragHandle label={`Drag ${card.title}`} handleProps={handleProps} />
        <div class="min-w-0 flex-1 py-2 pr-2">
          <strong class="block text-sm text-foreground">{card.title}</strong>
          <p class="m-0 mt-1 text-xs whitespace-pre-wrap text-muted-foreground">{card.detail}</p>
          <div class="mt-2">
            <MoveMenu
              actions={[
                { id: "up", label: "Up", onSelect: () => moveByKeyboard({ type: "up" }) },
                { id: "down", label: "Down", onSelect: () => moveByKeyboard({ type: "down" }) },
                ...columns
                  .filter((column) => column !== columnId)
                  .map((target) => ({
                    id: target,
                    label: `To ${columnLabels[target]}`,
                    onSelect: () => transfer(target),
                  })),
              ]}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
