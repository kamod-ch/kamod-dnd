import type { JSX } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";

export type MoveAction = {
  id: string;
  label: string;
  onSelect: () => void;
};

type MoveMenuProps = {
  actions: MoveAction[];
};

export function MoveMenu({ actions }: MoveMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef}>
      <button
        type="button"
        class="inline-flex min-h-8 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        Move
      </button>
      {open ? (
        <div
          id={menuId}
          class="mt-1 min-w-36 rounded-md border border-border bg-card p-1 shadow-md"
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              class="flex min-h-9 w-full items-center rounded-md px-2 text-left text-xs font-medium text-foreground hover:bg-muted"
              onClick={() => {
                action.onSelect();
                setOpen(false);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
