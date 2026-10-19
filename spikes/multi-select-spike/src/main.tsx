import {
  applyMoveIntentToIds,
  DndProvider,
  type MoveIntent,
  useDndState,
  useSortable,
  useSortableContainer,
} from "@kamod-ch/dnd";
import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  batchIndexFromSingle,
  commitBatch,
  sameOrders,
  stableMembers,
  type ContainerOrders,
} from "./batch.js";

type Card = { id: string; title: string };

const COLUMNS = ["todo", "doing", "done"] as const;
const LABELS: Record<string, string> = { todo: "To do", doing: "Doing", done: "Done" };

const INITIAL: Record<string, Card[]> = {
  todo: [
    { id: "c1", title: "Write spec" },
    { id: "c2", title: "Design API" },
    { id: "c4", title: "blocked release" },
  ],
  doing: [{ id: "c3", title: "Build spike" }],
  done: [],
};

function ordersOf(lists: Record<string, Card[]>): ContainerOrders {
  return {
    todo: lists.todo.map((card) => card.id),
    doing: lists.doing.map((card) => card.id),
    done: lists.done.map((card) => card.id),
  };
}

function cardsById(lists: Record<string, Card[]>): Map<string, Card> {
  const cards = new Map<string, Card>();
  for (const column of COLUMNS) {
    for (const card of lists[column] ?? []) cards.set(card.id, card);
  }
  return cards;
}

function remap(lists: Record<string, Card[]>, orders: ContainerOrders): Record<string, Card[]> {
  const cards = cardsById(lists);
  const next: Record<string, Card[]> = {};
  for (const column of COLUMNS) {
    next[column] = (orders[column] ?? []).map((id) => cards.get(id)!);
  }
  return next;
}

function allowed(card: Card, targetContainerId: string): boolean {
  return !(targetContainerId === "done" && card.title.includes("blocked"));
}

function App() {
  const [lists, setLists] = useState(INITIAL);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [, setHistory] = useState<ContainerOrders[]>([]);
  const [groupStatus, setGroupStatus] = useState("Idle.");
  const listsRef = useRef(lists);
  const selectedRef = useRef(selected);
  const originRef = useRef<{ activeId: string; selected: Set<string> } | null>(null);
  const focusId = useRef<string | null>(null);
  listsRef.current = lists;
  selectedRef.current = selected;

  useEffect(() => {
    const id = focusId.current;
    if (!id) return;
    focusId.current = null;
    document.querySelector<HTMLElement>(`[data-testid="handle-${id}"]`)?.focus();
  }, [lists]);

  useEffect(() => {
    window.__select = (ids) => setSelected(new Set(ids));
    return () => {
      delete window.__select;
    };
  }, []);

  const applyOrders = (orders: ContainerOrders, message: string) => {
    const current = ordersOf(listsRef.current);
    if (sameOrders(current, orders)) {
      setGroupStatus(message);
      return;
    }
    setHistory((previous) => [...previous, current]);
    setLists((previous) => remap(previous, orders));
    setGroupStatus(message);
  };

  const onMove = (intent: MoveIntent<Card>) => {
    const listsNow = listsRef.current;
    const orders = ordersOf(listsNow);
    const selection = selectedRef.current;
    const origin = originRef.current;
    const startedAsGroup =
      origin?.activeId === intent.itemId &&
      origin.selected.size > 1 &&
      origin.selected.has(intent.itemId);
    if (startedAsGroup && !selection.has(intent.itemId)) {
      setGroupStatus("Rejected the batch. Nothing moved.");
      return false;
    }
    const group = selection.has(intent.itemId) && (startedAsGroup || selection.size > 1);
    if (!group) {
      const mutable: Record<string, string[]> = {};
      for (const [column, ids] of Object.entries(orders)) mutable[column] = [...ids];
      applyOrders(
        applyMoveIntentToIds(mutable, intent),
        `Moved ${intent.data.title} to ${LABELS[intent.targetContainerId] ?? intent.targetContainerId}.`,
      );
      return true;
    }
    const members = stableMembers(COLUMNS, orders, selection, (id) => cardsById(listsNow).get(id)!);
    if (!members.some((member) => member.id === intent.itemId)) {
      setGroupStatus("Rejected the batch. Nothing moved.");
      return false;
    }
    const targetIndex = batchIndexFromSingle({
      targetIds: orders[intent.targetContainerId] ?? [],
      activeId: intent.itemId,
      selected: selection,
      singleTargetIndex: intent.targetIndex,
      sameContainer: intent.sourceContainerId === intent.targetContainerId,
    });
    const committed = commitBatch(
      orders,
      members,
      intent.targetContainerId,
      targetIndex,
      (member) => allowed(member.data, intent.targetContainerId),
    );
    if (!committed) {
      setGroupStatus(`Rejected ${members.length} cards. Nothing moved.`);
      return false;
    }
    const label = LABELS[intent.targetContainerId] ?? intent.targetContainerId;
    applyOrders(committed.orders, `Moved ${committed.intent.itemIds.length} cards to ${label}.`);
    return true;
  };

  const moveSelectionTo = (targetContainerId: string) => {
    const orders = ordersOf(listsRef.current);
    const members = stableMembers(COLUMNS, orders, selectedRef.current, (id) =>
      cardsById(listsRef.current).get(id)!,
    );
    if (members.length === 0) {
      setGroupStatus("No cards selected.");
      return;
    }
    const without = (orders[targetContainerId] ?? []).filter(
      (id) => !members.some((member) => member.id === id),
    );
    const committed = commitBatch(orders, members, targetContainerId, without.length, (member) =>
      allowed(member.data, targetContainerId),
    );
    if (!committed) {
      setGroupStatus(`Rejected ${members.length} cards. Nothing moved.`);
      return;
    }
    const label = LABELS[targetContainerId] ?? targetContainerId;
    if (!sameOrders(orders, committed.orders)) {
      focusId.current = committed.intent.itemIds[0] ?? null;
    }
    applyOrders(committed.orders, `Moved ${committed.intent.itemIds.length} cards to ${label}.`);
  };

  const undo = () => {
    setHistory((previous) => {
      const prior = previous[previous.length - 1];
      if (!prior) return previous;
      setLists((current) => remap(current, prior));
      setGroupStatus("Undid the last move.");
      return previous.slice(0, -1);
    });
  };

  return (
    <DndProvider<Card>
      onMove={onMove}
      dropRule={(ctx) => allowed(ctx.data, ctx.targetContainerId)}
      getItemLabel={(_id, card) => card.title}
      getContainerLabel={(id) => LABELS[id] ?? id}
    >
      <main style={{ font: "16px sans-serif", padding: 16 }}>
        <h1 data-testid="title">Multi-select spike</h1>
        <p data-testid="selection-count">Selected: {selected.size}</p>
        <p data-testid="group-status" role="status">
          {groupStatus}
        </p>
        <p data-testid="order-todo">
          To do: {lists.todo.map((card) => card.id).join(",") || "none"}
        </p>
        <p data-testid="order-doing">
          Doing: {lists.doing.map((card) => card.id).join(",") || "none"}
        </p>
        <p data-testid="order-done">
          Done: {lists.done.map((card) => card.id).join(",") || "none"}
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" data-testid="to-todo" onClick={() => moveSelectionTo("todo")}>
            Move selection to To do
          </button>
          <button type="button" data-testid="to-doing" onClick={() => moveSelectionTo("doing")}>
            Move selection to Doing
          </button>
          <button type="button" data-testid="to-done" onClick={() => moveSelectionTo("done")}>
            Move selection to Done
          </button>
          <button type="button" data-testid="undo" onClick={undo}>
            Undo
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "start" }}>
          {COLUMNS.map((column) => (
            <Column
              key={column}
              id={column}
              cards={lists[column] ?? []}
              selected={selected}
              onToggle={(id, on) => {
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (on) next.add(id);
                  else next.delete(id);
                  return next;
                });
              }}
            />
          ))}
        </div>
        <PickupNotice lists={lists} selected={selected} />
        <RememberDragOrigin originRef={originRef} selectedRef={selectedRef} />
      </main>
    </DndProvider>
  );
}

function RememberDragOrigin({
  originRef,
  selectedRef,
}: {
  originRef: { current: { activeId: string; selected: Set<string> } | null };
  selectedRef: { current: Set<string> };
}) {
  const state = useDndState<Card>();
  useEffect(() => {
    if (
      state.phase === "dragging" &&
      state.activeId &&
      originRef.current?.activeId !== state.activeId
    ) {
      originRef.current = { activeId: state.activeId, selected: new Set(selectedRef.current) };
      return;
    }
    if (state.phase === "idle" || state.phase === "cancelled") originRef.current = null;
  }, [state.phase, state.activeId, originRef, selectedRef]);
  return null;
}

function PickupNotice({
  lists,
  selected,
}: {
  lists: Record<string, Card[]>;
  selected: Set<string>;
}) {
  const state = useDndState<Card>();
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (state.phase !== "dragging" || !state.activeId || !selected.has(state.activeId)) {
      return;
    }
    if (selected.size < 2) return;
    const members = stableMembers(COLUMNS, ordersOf(lists), selected, (id) => id);
    const labels = members.map((member) => cardsById(lists).get(member.id)?.title ?? member.id);
    setMessage(`Picked up ${members.length} cards: ${labels.join(", ")}.`);
  }, [state.phase, state.activeId, lists, selected]);
  return (
    <p data-testid="pickup" role="status">
      {message}
    </p>
  );
}

function Column({
  id,
  cards,
  selected,
  onToggle,
}: {
  id: string;
  cards: Card[];
  selected: Set<string>;
  onToggle: (id: string, on: boolean) => void;
}) {
  const { ref } = useSortableContainer({ id, itemIds: cards.map((card) => card.id) });
  return (
    <section
      ref={ref}
      data-testid={`column-${id}`}
      style={{ width: 240, minHeight: 280, padding: 8, background: "#f4f4f5" }}
    >
      <h2>{LABELS[id]}</h2>
      {cards.length === 0 && (
        <p data-testid={`empty-${id}`} style={{ minHeight: 64 }}>
          Drop cards here
        </p>
      )}
      {cards.map((card) => (
        <CardView
          key={card.id}
          card={card}
          columnId={id}
          selected={selected.has(card.id)}
          onToggle={onToggle}
        />
      ))}
    </section>
  );
}

function CardView({
  card,
  columnId,
  selected,
  onToggle,
}: {
  card: Card;
  columnId: string;
  selected: boolean;
  onToggle: (id: string, on: boolean) => void;
}) {
  const { itemRef, handleRef } = useSortable({ id: card.id, containerId: columnId, data: card });
  return (
    <article
      ref={itemRef}
      data-testid={`card-${card.id}`}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        minHeight: 72,
        marginBottom: 8,
        padding: 8,
        background: "#fff",
        border: "1px solid #ccc",
      }}
    >
      <button
        ref={handleRef}
        type="button"
        data-testid={`handle-${card.id}`}
        aria-label={`Drag ${card.title}`}
      >
        ⠿
      </button>
      <input
        type="checkbox"
        data-testid={`select-${card.id}`}
        checked={selected}
        aria-label={`Select ${card.title}`}
        onChange={(event) => onToggle(card.id, event.currentTarget.checked)}
      />
      <span>{card.title}</span>
    </article>
  );
}

render(<App />, document.getElementById("app")!);
