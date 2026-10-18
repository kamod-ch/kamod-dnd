import type { ComponentChildren } from "preact";

export type LiveRegionProps = {
  message: string;
  politeness?: "polite" | "assertive";
};

/** Visually hidden live region for screen reader announcements. */
export function DndLiveRegion({ message, politeness = "polite" }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {message as ComponentChildren}
    </div>
  );
}
