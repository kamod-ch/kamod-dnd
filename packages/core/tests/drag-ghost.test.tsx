import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { useRef } from "preact/hooks";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DragGhostPortal } from "../src/preact/drag-ghost.js";
import { DndProvider, useDndContext } from "../src/preact/context.js";

function GhostFixture() {
  const { controller } = useDndContext();
  const rowRef = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={rowRef} data-testid="row" style={{ width: 80, height: 24 }} />
      <button
        type="button"
        data-testid="start-drag"
        onClick={() => {
          const row = rowRef.current;
          if (!row) return;
          controller.registerContainer({ id: "list" });
          controller.setContainerOrder("list", ["a"]);
          controller.registerItem({ id: "a", containerId: "list", data: { n: 1 } });
          controller.registerItemElement("a", row);
          controller.handleDragStart("a");
        }}
      >
        start drag
      </button>
      <DragGhostPortal render={({ id }) => <span data-testid="ghost">{id}</span>} />
    </>
  );
}

describe("DragGhostPortal", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders nothing when idle", () => {
    render(
      <DndProvider onMove={() => true}>
        <GhostFixture />
      </DndProvider>,
    );
    expect(screen.queryByTestId("ghost")).toBeNull();
  });

  it("portals ghost content while dragging", async () => {
    let frames = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      if (frames < 2) {
        frames += 1;
        cb(0);
      }
      return frames;
    });
    render(
      <DndProvider onMove={() => true}>
        <GhostFixture />
      </DndProvider>,
    );
    fireEvent.click(screen.getByTestId("start-drag"));
    expect(screen.getByTestId("ghost")).toBeTruthy();
    expect(screen.getByTestId("ghost").textContent).toBe("a");
  });
});
