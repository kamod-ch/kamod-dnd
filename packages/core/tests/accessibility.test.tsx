import { act, cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { useState } from "preact/hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DndLocale } from "../src/accessibility/messages.js";
import { DndProvider, useDndContext } from "../src/preact/context.js";
import type { DndController } from "../src/session/controller.js";
import type { MoveIntent } from "../src/session/types.js";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "../src/sortable/hooks.js";

type ItemData = { n: number };

const locale: DndLocale = {
  messages: {
    pickedUp: ({ item }) => `pickup ${item}`,
    moved: ({ item, position }) => `move ${item} @ ${position}`,
    movedToContainer: ({ item, container }) => `transfer ${item} -> ${container}`,
    dropped: ({ item }) => `drop ${item}`,
    cancelled: ({ item }) => `cancel ${item}`,
  },
};

function registerLists(controller: DndController<ItemData>) {
  controller.registerContainer({ id: "list" });
  controller.registerContainer({ id: "other" });
  controller.setContainerOrder("list", ["a", "b"]);
  controller.setContainerOrder("other", []);
  controller.registerItem({ id: "a", containerId: "list", data: { n: 1 } });
  controller.registerItem({ id: "b", containerId: "list", data: { n: 1 } });
}

function PointerProbe() {
  const { controller } = useDndContext<ItemData>();
  return (
    <>
      <button type="button" onClick={() => registerLists(controller)}>
        register
      </button>
      <button type="button" onClick={() => controller.handleDragStart("a")}>
        start
      </button>
      <button
        type="button"
        onClick={() =>
          controller.handleDragOver({ overId: "b", overContainerId: "list", edge: "top" })
        }
      >
        over
      </button>
      <button
        type="button"
        onClick={() =>
          controller.handleDragOver({ overId: null, overContainerId: "other", edge: "bottom" })
        }
      >
        transfer
      </button>
      <button type="button" onClick={() => controller.handleDrop()}>
        drop
      </button>
    </>
  );
}

function statusText() {
  return screen.getByRole("status").textContent;
}

describe("drag announcements", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("announces pointer pickup, one-based movement, transfer, and drop", () => {
    render(
      <DndProvider<ItemData> locale={locale}>
        <PointerProbe />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "register" }));
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(statusText()).toBe("pickup a");
    fireEvent.click(screen.getByRole("button", { name: "over" }));
    expect(statusText()).toBe("move a @ 1");
    fireEvent.click(screen.getByRole("button", { name: "transfer" }));
    expect(statusText()).toBe("transfer a -> other");
    fireEvent.click(screen.getByRole("button", { name: "drop" }));
    expect(statusText()).toBe("drop a");
  });

  it("announces Escape once with the active item id", () => {
    let cancels = 0;
    const counting: DndLocale = {
      messages: {
        ...locale.messages,
        cancelled: ({ item }) => {
          cancels += 1;
          return `cancel ${item}`;
        },
      },
    };
    render(
      <DndProvider<ItemData> locale={counting}>
        <PointerProbe />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "register" }));
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(statusText()).toBe("cancel a");
    expect(cancels).toBe(1);
  });

  it("uses the latest locale and a single session subscription", () => {
    const seen: string[] = [];
    const first: DndLocale = {
      messages: {
        pickedUp: ({ item }) => {
          seen.push(`one ${item}`);
          return `one ${item}`;
        },
      },
    };
    const second: DndLocale = {
      messages: {
        pickedUp: ({ item }) => {
          seen.push(`two ${item}`);
          return `two ${item}`;
        },
        cancelled: ({ item }) => `bye ${item}`,
      },
    };
    const view = render(
      <DndProvider<ItemData> locale={first}>
        <PointerProbe />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "register" }));
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(statusText()).toBe("one a");
    view.rerender(
      <DndProvider<ItemData> locale={second}>
        <PointerProbe />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(seen).toEqual(["one a", "two a"]);
    expect(statusText()).toBe("two a");
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(statusText()).toBe("bye a");
  });

  it("removes the session subscription and engine listener on unmount", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const keydowns = (spy: { mock: { calls: unknown[][] } }) =>
      spy.mock.calls.filter((call) => call[0] === "keydown").length;
    const addedBefore = keydowns(add);
    const removedBefore = keydowns(remove);
    const view = render(
      <DndProvider<ItemData> locale={locale}>
        <PointerProbe />
      </DndProvider>,
    );
    expect(keydowns(add) - addedBefore).toBeGreaterThan(0);
    view.unmount();
    expect(keydowns(remove) - removedBefore).toBe(keydowns(add) - addedBefore);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("announces one-based keyboard moves, transfers, and stays silent when rejected", () => {
    let allow = true;

    function Row({ id, containerId }: { id: string; containerId: string }) {
      const { itemRef, handleRef, moveByKeyboard } = useSortable({
        id,
        containerId,
        data: { n: 1 },
      });
      return (
        <div ref={itemRef}>
          <button ref={handleRef} type="button">
            {`handle-${id}`}
          </button>
          <button type="button" onClick={() => moveByKeyboard({ type: "down" })}>
            {`down-${id}`}
          </button>
          <button type="button" onClick={() => moveByKeyboard({ type: "up" })}>
            {`up-${id}`}
          </button>
          <button
            type="button"
            onClick={() => moveByKeyboard({ type: "transfer", targetContainerId: "other" })}
          >
            {`transfer-${id}`}
          </button>
        </div>
      );
    }

    function Board({ order }: { order: string[] }) {
      const list = useSortableContainer({ id: "list", itemIds: order });
      const other = useSortableContainer({ id: "other", itemIds: [] });
      return (
        <>
          <div ref={list.ref}>
            {order.map((id) => (
              <Row key={id} id={id} containerId="list" />
            ))}
          </div>
          <div ref={other.ref} />
        </>
      );
    }

    function App() {
      const [order, setOrder] = useState(["a", "b"]);
      const onMove = (intent: MoveIntent<ItemData>) => {
        const next = applyMoveIntentToIds({ list: order, other: [] }, intent);
        setOrder(next.list ?? order);
      };
      return (
        <DndProvider<ItemData> locale={locale} dropRule={() => allow} onMove={onMove}>
          <Board order={order} />
        </DndProvider>
      );
    }

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "up-a" }));
    expect(statusText()).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "down-a" }));
    expect(statusText()).toBe("move a @ 2");
    allow = false;
    fireEvent.click(screen.getByRole("button", { name: "up-a" }));
    expect(statusText()).toBe("move a @ 2");
    allow = true;
    fireEvent.click(screen.getByRole("button", { name: "transfer-a" }));
    expect(statusText()).toBe("transfer a -> other");
  });
});
