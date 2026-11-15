import { describe, expect, it, vi } from "vitest";
import { registerDraggableElement } from "../src/engine/pragmatic/bindings.js";
import { DndController } from "../src/session/controller.js";

vi.mock("../src/engine/pragmatic/bindings.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/engine/pragmatic/bindings.js")>();
  return {
    ...actual,
    registerDraggableElement: vi.fn(actual.registerDraggableElement),
  };
});

describe("pinned drag source", () => {
  it("adoptPinnedDragSource registers pragmatic on the pin element", () => {
    const controller = new DndController<{ n: number }>({});
    const pin = document.createElement("div");
    document.body.appendChild(pin);
    const handle = document.createElement("button");
    document.body.appendChild(handle);
    controller.setDragPinElement(pin);
    controller.registerContainer({ id: "list" });
    controller.setContainerOrder("list", ["a", "b"]);
    controller.registerItem({ id: "a", containerId: "list", data: { n: 1 } });
    const rowCleanup = vi.fn();
    controller.registerRowDraggableCleanup("a", rowCleanup);
    controller.handleDragStart("a");
    const ok = controller.adoptPinnedDragSource({
      itemId: "a",
      containerId: "list",
      handle,
      disabled: false,
    });
    expect(ok).toBe(true);
    expect(rowCleanup).toHaveBeenCalled();
    expect(registerDraggableElement).toHaveBeenCalledWith(
      expect.objectContaining({ element: pin, handle, itemId: "a" }),
    );
    pin.remove();
    handle.remove();
  });
});
