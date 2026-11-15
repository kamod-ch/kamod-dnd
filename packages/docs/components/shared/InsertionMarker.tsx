import type { JSX } from "preact";

type InsertionMarkerProps = {
  axis?: "x" | "y";
};

export function InsertionMarker({ axis = "y" }: InsertionMarkerProps): JSX.Element {
  const className =
    axis === "x"
      ? "min-h-11 w-1 shrink-0 self-stretch rounded-full bg-brand"
      : "h-1 shrink-0 rounded-full bg-brand";
  return <div aria-hidden="true" class={className} />;
}
