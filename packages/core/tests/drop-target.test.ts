import { describe, expect, it } from "vitest";
import {
  pickActiveDropTarget,
  selectScopedDropTarget,
} from "../src/engine/pragmatic/drop-target.js";
import { CONTAINER_TYPE, ITEM_TYPE, SCOPE_KEY } from "../src/engine/pragmatic/types.js";

function target(type: string, extra: Record<string, unknown> = {}) {
  return { data: { type, ...extra } };
}

describe("pickActiveDropTarget", () => {
  it("prefers the first item target for flat list reorder", () => {
    const picked = pickActiveDropTarget([
      target(ITEM_TYPE, { itemId: "a", containerId: "list" }),
      target(CONTAINER_TYPE, { containerId: "list" }),
    ]);
    expect(picked?.data.itemId).toBe("a");
  });

  it("prefers item when it is more specific than the column container", () => {
    const picked = pickActiveDropTarget([
      target(ITEM_TYPE, { itemId: "c1", containerId: "todo" }),
      target(CONTAINER_TYPE, { containerId: "todo" }),
    ]);
    expect(picked?.data.itemId).toBe("c1");
  });

  it("prefers nested container when it is at least as specific as parent item", () => {
    const picked = pickActiveDropTarget([
      target(CONTAINER_TYPE, { containerId: "c1" }),
      target(ITEM_TYPE, { itemId: "c1", containerId: "rA" }),
      target(CONTAINER_TYPE, { containerId: "rA" }),
    ]);
    expect(picked?.data.containerId).toBe("c1");
    expect(picked?.data.type).toBe(CONTAINER_TYPE);
  });

  it("prefers item when nested child container is deeper than the hovered row", () => {
    const picked = pickActiveDropTarget([
      target(CONTAINER_TYPE, { containerId: "g1" }),
      target(ITEM_TYPE, { itemId: "g1", containerId: "c1" }),
      target(CONTAINER_TYPE, { containerId: "c1" }),
      target(CONTAINER_TYPE, { containerId: "rA" }),
    ]);
    expect(picked?.data.containerId).toBe("g1");
    expect(picked?.data.type).toBe(CONTAINER_TYPE);
  });

  it("prefers hovered item for reparent onto a row in a foreign list", () => {
    const picked = pickActiveDropTarget([
      target(ITEM_TYPE, { itemId: "g1", containerId: "c1" }),
      target(CONTAINER_TYPE, { containerId: "c1" }),
      target(CONTAINER_TYPE, { containerId: "rA" }),
    ]);
    expect(picked?.data.itemId).toBe("g1");
  });

  it("returns null for empty input", () => {
    expect(pickActiveDropTarget([])).toBeNull();
  });

  it("drops foreign scopes before applying nested-target precedence", () => {
    const picked = selectScopedDropTarget(
      [
        target(ITEM_TYPE, { itemId: "a", containerId: "list", [SCOPE_KEY]: "provider-b" }),
        target(CONTAINER_TYPE, { containerId: "child", [SCOPE_KEY]: "provider-a" }),
        target(ITEM_TYPE, { itemId: "child", containerId: "parent", [SCOPE_KEY]: "provider-a" }),
        target(CONTAINER_TYPE, { containerId: "parent", [SCOPE_KEY]: "provider-a" }),
      ],
      "provider-a",
    );
    expect(picked?.data.containerId).toBe("child");
    expect(picked?.data.type).toBe(CONTAINER_TYPE);
    expect(picked?.data[SCOPE_KEY]).toBe("provider-a");
  });

  it("returns null when every target belongs to another provider", () => {
    const picked = selectScopedDropTarget(
      [target(ITEM_TYPE, { itemId: "a", containerId: "list", [SCOPE_KEY]: "provider-b" })],
      "provider-a",
    );
    expect(picked).toBeNull();
  });
});
