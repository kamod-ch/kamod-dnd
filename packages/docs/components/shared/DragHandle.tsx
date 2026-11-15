import type { ButtonHTMLAttributes, JSX } from "preact";

export const dragItemClass =
  "shadow-sm motion-safe:transition-shadow data-[dragging=true]:opacity-60 data-[dragging=true]:shadow-lg";

type DragHandleProps = {
  label: string;
  handleProps: ButtonHTMLAttributes<HTMLButtonElement>;
  class?: string;
};

export function DragHandle({
  label,
  handleProps,
  class: className = "",
}: DragHandleProps): JSX.Element {
  return (
    <button
      {...handleProps}
      aria-label={label}
      class={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-base leading-none text-muted-foreground hover:bg-muted hover:text-foreground ${className}`}
    >
      <span aria-hidden="true">⠿</span>
    </button>
  );
}
