import type { ComponentChildren } from "preact";

export type LiveRegionProps = {
  message: string;
  politeness?: "polite" | "assertive";
};

const visuallyHiddenStyle = {
  position: "fixed" as const,
  left: 0,
  top: 0,
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap" as const,
  border: 0,
};

/** Visually hidden live region for screen reader announcements. */
export function DndLiveRegion({ message, politeness = "polite" }: LiveRegionProps) {
  return (
    <div role="status" aria-live={politeness} aria-atomic="true" style={visuallyHiddenStyle}>
      {message as ComponentChildren}
    </div>
  );
}
