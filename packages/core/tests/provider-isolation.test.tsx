import { cleanup, render } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deliverElementDrag, deliverElementDrop } from "../src/engine/pragmatic/bindings.js";
import { ITEM_TYPE, SCOPE_KEY } from "../src/engine/pragmatic/types.js";
import { DndProvider, useDndContext } from "../src/preact/context.js";
import { DndController } from "../src/session/controller.js";
import type { DndSessionEvent } from "../src/session/types.js";

function setupList(controller: DndController<{ n: number }>) {
  controller.registerContainer({ id: "list" });
  controller.setContainerOrder("list", ["a", "b"]);
  controller.registerItem({ id: "a", containerId: "list", data: { n: 1 } });
  controller.registerItem({ id: "b", containerId: "list", data: { n: 1 } });
}

function sourceFor(controller: DndController<{ n: number }>) {
  return {
    type: ITEM_TYPE,
    itemId: "a",
    containerId: "list",
    [SCOPE_KEY]: controller.scopeToken,
  };
}

describe("provider isolation", () => {
  afterEach(() => {
    cleanup();
  });

  it("gives each controller a distinct scope and ignores foreign drags", () => {
    const onMoveA = vi.fn();
    const onMoveB = vi.fn();
    const onCancelB = vi.fn();
    const dropRuleB = vi.fn(() => true);
    const controllerA = new DndController<{ n: number }>({ onMove: onMoveA });
    const controllerB = new DndController<{ n: number }>({
      onMove: onMoveB,
      onCancel: onCancelB,
      dropRule: dropRuleB,
    });
    setupList(controllerA);
    setupList(controllerB);
    const eventsA: DndSessionEvent<{ n: number }>["type"][] = [];
    const eventsB: DndSessionEvent<{ n: number }>["type"][] = [];
    controllerA.subscribe((event) => eventsA.push(event.type));
    controllerB.subscribe((event) => eventsB.push(event.type));

    expect(controllerA.scopeToken).not.toBe(controllerB.scopeToken);

    const foreignTargets = [
      {
        data: {
          type: ITEM_TYPE,
          itemId: "b",
          containerId: "list",
          [SCOPE_KEY]: controllerB.scopeToken,
        },
      },
    ];
    deliverElementDrag(controllerB, sourceFor(controllerA), foreignTargets);
    deliverElementDrop(controllerB, sourceFor(controllerA));
    expect(eventsB).toEqual([]);
    expect(controllerB.readSnapshot().phase).toBe("idle");
    expect(onMoveB).not.toHaveBeenCalled();
    expect(onCancelB).not.toHaveBeenCalled();
    expect(dropRuleB).not.toHaveBeenCalled();

    deliverElementDrag(controllerA, sourceFor(controllerA), [
      {
        data: {
          type: ITEM_TYPE,
          itemId: "b",
          containerId: "list",
          [SCOPE_KEY]: controllerA.scopeToken,
        },
      },
    ]);
    deliverElementDrop(controllerA, sourceFor(controllerA));
    expect(eventsA).toEqual(["start", "over", "drop"]);
    expect(onMoveA).toHaveBeenCalledTimes(1);
  });

  it("keeps a nested provider drag inside the owning provider", () => {
    let outer: DndController<{ n: number }> | null = null;
    let inner: DndController<{ n: number }> | null = null;
    const outerEvents: string[] = [];
    const innerEvents: string[] = [];

    function Probe({
      onController,
    }: {
      onController: (controller: DndController<{ n: number }>) => void;
    }) {
      const { controller } = useDndContext<{ n: number }>();
      onController(controller);
      return null;
    }

    render(
      <DndProvider<{ n: number }>>
        <Probe
          onController={(controller) => {
            outer = controller;
          }}
        />
        <DndProvider<{ n: number }>>
          <Probe
            onController={(controller) => {
              inner = controller;
            }}
          />
        </DndProvider>
      </DndProvider>,
    );

    expect(outer).not.toBeNull();
    expect(inner).not.toBeNull();
    expect(outer!.scopeToken).not.toBe(inner!.scopeToken);
    setupList(outer!);
    setupList(inner!);
    outer!.subscribe((event) => outerEvents.push(event.type));
    inner!.subscribe((event) => innerEvents.push(event.type));

    deliverElementDrag(outer!, sourceFor(inner!), [
      {
        data: {
          type: ITEM_TYPE,
          itemId: "b",
          containerId: "list",
          [SCOPE_KEY]: inner!.scopeToken,
        },
      },
    ]);
    expect(outerEvents).toEqual([]);
    expect(outer!.readSnapshot().phase).toBe("idle");

    deliverElementDrag(inner!, sourceFor(inner!), [
      {
        data: {
          type: ITEM_TYPE,
          itemId: "b",
          containerId: "list",
          [SCOPE_KEY]: inner!.scopeToken,
        },
      },
    ]);
    expect(innerEvents).toEqual(["start", "over"]);
    expect(inner!.readSnapshot().phase).toBe("dragging");
  });

  it("leaves the remaining provider usable after the other unmounts", () => {
    let first: DndController<{ n: number }> | null = null;
    let second: DndController<{ n: number }> | null = null;
    function Probe({
      onController,
    }: {
      onController: (controller: DndController<{ n: number }>) => void;
    }) {
      const { controller } = useDndContext<{ n: number }>();
      onController(controller);
      return <span>probe</span>;
    }
    const view = render(
      <div>
        <DndProvider<{ n: number }> key="a">
          <Probe
            onController={(controller) => {
              first = controller;
            }}
          />
        </DndProvider>
        <DndProvider<{ n: number }> key="b">
          <Probe
            onController={(controller) => {
              second = controller;
            }}
          />
        </DndProvider>
      </div>,
    );
    const remove = vi.spyOn(window, "removeEventListener");
    view.rerender(
      <div>
        <DndProvider<{ n: number }> key="b">
          <Probe
            onController={(controller) => {
              second = controller;
            }}
          />
        </DndProvider>
      </div>,
    );
    expect(remove.mock.calls.some((call) => call[0] === "keydown")).toBe(true);
    setupList(second!);
    const events: string[] = [];
    second!.subscribe((event) => events.push(event.type));
    deliverElementDrag(second!, sourceFor(second!), []);
    expect(second!.readSnapshot().activeId).toBe("a");
    expect(first!.readSnapshot().phase).toBe("idle");
    expect(events).toEqual(["start"]);
  });
});
