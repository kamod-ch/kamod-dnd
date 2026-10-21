import { createPortal } from "preact/compat";
import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { useDndContext } from "./context.js";
import { useDndState } from "./hooks.js";
import type { DndId } from "../session/types.js";

export type DragGhostPortalProps = {
  render: (args: { id: DndId; data: unknown }) => ComponentChildren;
  zIndex?: number;
};

/** Renders a fixed-position ghost in `document.body` while an item is dragging. */
export function DragGhostPortal({ render, zIndex = 9999 }: DragGhostPortalProps) {
  const { controller } = useDndContext();
  const snapshot = useDndState();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (snapshot.phase !== "dragging" || !snapshot.activeId) {
      setRect(null);
      return;
    }
    let frame = 0;
    const update = () => {
      const element = controller.getItemElement(snapshot.activeId!);
      if (element?.isConnected) setRect(element.getBoundingClientRect());
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [controller, snapshot.phase, snapshot.activeId]);

  if (snapshot.phase !== "dragging" || !snapshot.activeId || !rect) return null;
  const content = render({ id: snapshot.activeId, data: snapshot.activeData });
  if (content == null || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex,
        pointerEvents: "none",
        margin: 0,
      }}
    >
      {content}
    </div>,
    document.body,
  );
}
