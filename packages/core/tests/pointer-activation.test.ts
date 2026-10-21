import { describe, expect, it } from "vitest";
import {
  bindPointerActivationOrigin,
  pointerActivationAllowsDrag,
} from "../src/engine/pragmatic/pointer-activation.js";

describe("pointerActivationAllowsDrag", () => {
  it("allows drag when no activation config is set", () => {
    const handle = document.createElement("button");
    expect(pointerActivationAllowsDrag(handle, { clientX: 0, clientY: 0 }, undefined)).toBe(true);
  });

  it("blocks drag until pointer moves beyond distance", () => {
    const handle = document.createElement("button");
    bindPointerActivationOrigin(handle);
    handle.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }),
    );
    expect(pointerActivationAllowsDrag(handle, { clientX: 4, clientY: 0 }, { distance: 8 })).toBe(
      false,
    );
    expect(pointerActivationAllowsDrag(handle, { clientX: 10, clientY: 0 }, { distance: 8 })).toBe(
      true,
    );
  });
});
