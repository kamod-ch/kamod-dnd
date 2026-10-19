import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import type { RefObject } from "preact";
import { useState } from "preact/hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DndProvider, useDndContext } from "../src/preact/context.js";
import type { DndController } from "../src/session/controller.js";
import type { MoveIntent } from "../src/session/types.js";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "../src/sortable/hooks.js";
import { buildMoveIntent } from "../src/sortable/move-helpers.js";

type ItemData = { n: number };

const intent = buildMoveIntent<ItemData>({
  itemId: "a",
  sourceContainerId: "list",
  targetContainerId: "list",
  targetIndex: 0,
  data: { n: 1 },
});

function registerList(controller: DndController<ItemData>) {
  controller.registerContainer({ id: "list" });
  controller.setContainerOrder("list", ["a"]);
  controller.registerItem({ id: "a", containerId: "list", data: { n: 1 } });
}

function Probe({ onController }: { onController: (controller: DndController<ItemData>) => void }) {
  const { controller } = useDndContext<ItemData>();
  const [commitResult, setCommitResult] = useState("");
  const [phase, setPhase] = useState("");
  onController(controller);

  return (
    <>
      <button type="button" onClick={() => registerList(controller)}>
        register
      </button>
      <button
        type="button"
        onClick={() => {
          controller.handleDragStart("a");
          setPhase(controller.readSnapshot().phase);
        }}
      >
        start
      </button>
      <button type="button" onClick={() => controller.cancel("escape")}>
        cancel
      </button>
      <button
        type="button"
        onClick={() => {
          setCommitResult(controller.tryCommitMove(intent) ? "accepted" : "rejected");
        }}
      >
        commit
      </button>
      <span data-testid="commit-result">{commitResult}</span>
      <span data-testid="phase">{phase}</span>
    </>
  );
}

function keydownCalls(spy: { mock: { calls: unknown[][] } }) {
  return spy.mock.calls.filter((call) => call[0] === "keydown").length;
}

describe("DndProvider", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses the latest onMove after rerender", () => {
    const onMoveA = vi.fn();
    const onMoveB = vi.fn();
    let controller: DndController<ItemData> | null = null;

    const view = render(
      <DndProvider onMove={onMoveA}>
        <Probe onController={(next) => (controller = next)} />
      </DndProvider>,
    );
    const first = controller;
    view.rerender(
      <DndProvider onMove={onMoveB}>
        <Probe onController={(next) => (controller = next)} />
      </DndProvider>,
    );

    expect(controller).toBe(first);
    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    expect(screen.getByTestId("commit-result").textContent).toBe("accepted");
    expect(onMoveA).not.toHaveBeenCalled();
    expect(onMoveB).toHaveBeenCalledTimes(1);
  });

  it("uses the latest dropRule after rerender", () => {
    const onMove = vi.fn();
    const view = render(
      <DndProvider dropRule={() => true} onMove={onMove}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );
    view.rerender(
      <DndProvider dropRule={() => false} onMove={onMove}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    expect(screen.getByTestId("commit-result").textContent).toBe("rejected");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("uses the latest onCancel after rerender", () => {
    const onCancelA = vi.fn();
    const onCancelB = vi.fn();
    const view = render(
      <DndProvider onCancel={onCancelA}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "register" }));
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    view.rerender(
      <DndProvider onCancel={onCancelB}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(onCancelA).not.toHaveBeenCalled();
    expect(onCancelB).toHaveBeenCalledTimes(1);
    expect(onCancelB).toHaveBeenCalledWith("escape");
  });

  it("keeps the same controller and registrations when scrollRef changes", () => {
    const scrollA: RefObject<HTMLElement> = { current: null };
    const scrollB: RefObject<HTMLElement> = { current: document.createElement("div") };
    let controller: DndController<ItemData> | null = null;
    const view = render(
      <DndProvider scrollRef={scrollA}>
        <Probe onController={(next) => (controller = next)} />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "register" }));
    const first = controller;

    view.rerender(
      <DndProvider scrollRef={scrollB}>
        <Probe onController={(next) => (controller = next)} />
      </DndProvider>,
    );

    expect(controller).toBe(first);
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(screen.getByTestId("phase").textContent).toBe("dragging");
  });

  it("rejects false onMove results and accepts an absent return", () => {
    const rejecting = vi.fn(() => false as boolean | void);
    const accepting = vi.fn(() => undefined as boolean | void);
    const view = render(
      <DndProvider onMove={rejecting}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    expect(screen.getByTestId("commit-result").textContent).toBe("rejected");

    view.rerender(
      <DndProvider onMove={accepting}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "commit" }));
    expect(screen.getByTestId("commit-result").textContent).toBe("accepted");
    expect(rejecting).toHaveBeenCalledTimes(1);
    expect(accepting).toHaveBeenCalledTimes(1);
  });

  it("unbinds the engine and disposes once on unmount", () => {
    const onCancel = vi.fn();
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const addedBefore = keydownCalls(add);
    const removedBefore = keydownCalls(remove);

    const view = render(
      <DndProvider onCancel={onCancel}>
        <Probe onController={() => {}} />
      </DndProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "register" }));
    fireEvent.click(screen.getByRole("button", { name: "start" }));
    expect(keydownCalls(add) - addedBefore).toBeGreaterThan(0);

    view.unmount();

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledWith("unmount");
    expect(keydownCalls(remove) - removedBefore).toBe(keydownCalls(add) - addedBefore);
  });

  it("applies two sequential keyboard moves with the latest closed-over order", () => {
    function Row({ id }: { id: string }) {
      const { itemRef, handleRef, moveByKeyboard } = useSortable({
        id,
        containerId: "list",
        data: { n: 1 },
      });
      return (
        <div ref={itemRef}>
          <button ref={handleRef} type="button" onClick={() => moveByKeyboard({ type: "down" })}>
            {`down-${id}`}
          </button>
          <button type="button" onClick={() => moveByKeyboard({ type: "up" })}>
            {`up-${id}`}
          </button>
        </div>
      );
    }

    function List({ order }: { order: string[] }) {
      const { ref } = useSortableContainer({ id: "list", itemIds: order });
      return (
        <div ref={ref}>
          <span data-testid="order">{order.join(",")}</span>
          {order.map((id) => (
            <Row key={id} id={id} />
          ))}
        </div>
      );
    }

    function App() {
      const [order, setOrder] = useState(["a", "b", "c"]);
      const onMove = (nextIntent: MoveIntent<ItemData>) => {
        setOrder(applyMoveIntentToIds({ list: order }, nextIntent).list ?? order);
      };
      return (
        <DndProvider onMove={onMove}>
          <List order={order} />
        </DndProvider>
      );
    }

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "down-a" }));
    expect(screen.getByTestId("order").textContent).toBe("b,a,c");
    fireEvent.click(screen.getByRole("button", { name: "up-c" }));
    expect(screen.getByTestId("order").textContent).toBe("b,c,a");
  });

  it("updates item data during a drag without unregistering it", () => {
    const onCancel = vi.fn();
    let controller: DndController<ItemData> | null = null;

    function Row({ data }: { data: ItemData }) {
      const sortable = useSortable({ id: "a", containerId: "list", data });
      const { ref } = useSortableContainer({ id: "list", itemIds: ["a", "b"] });
      return (
        <div ref={ref}>
          <div ref={sortable.itemRef}>
            <button ref={sortable.handleRef} type="button">
              handle
            </button>
          </div>
        </div>
      );
    }

    function App({ data }: { data: ItemData }) {
      return (
        <DndProvider<ItemData> onCancel={onCancel}>
          <Probe onController={(next) => (controller = next)} />
          <Row data={data} />
        </DndProvider>
      );
    }

    const view = render(<App data={{ n: 1 }} />);
    controller!.handleDragStart("a");
    expect(controller!.readSnapshot().phase).toBe("dragging");
    view.rerender(<App data={{ n: 2 }} />);
    expect(onCancel).not.toHaveBeenCalled();
    expect(controller!.readSnapshot().phase).toBe("dragging");
    expect(controller!.getItemData("a")).toEqual({ n: 2 });
  });
});
