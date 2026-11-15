import type { ComponentChildren, JSX } from "preact";
import { createContext } from "preact";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import { CodePreview } from "./CodePreview";

export type DemoNotice = {
  tone: "idle" | "move" | "reject";
  text: string;
};

export const IDLE_NOTICE: DemoNotice = { tone: "idle", text: "" };

type FrameApi = {
  notice: DemoNotice;
  setNotice: (notice: DemoNotice) => void;
  setReset: (reset: (() => void) | null) => void;
};

const ExampleFrameContext = createContext<FrameApi | null>(null);

const detachedFrame: FrameApi = {
  notice: IDLE_NOTICE,
  setNotice: () => {},
  setReset: () => {},
};

export function useExampleFrame(): FrameApi {
  return useContext(ExampleFrameContext) ?? detachedFrame;
}

export function useDemoReset(reset: () => void): void {
  const { setNotice, setReset } = useExampleFrame();
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    setReset(() => {
      resetRef.current();
      setNotice(IDLE_NOTICE);
    });
    return () => setReset(null);
  }, [setNotice, setReset]);
}

const BADGE_TITLES: Record<string, string> = {
  sortable: "Reorder by index inside one container",
  handle: "Pointer drag starts on the handle",
  keyboard: "Space, Enter, and arrow keys move the focused item",
  orientation: "Hit testing follows the container axis",
  horizontal: "Left and right along the row",
  dropRule: "Reject a drop before onMove runs",
  transfer: "Move an item into another container",
  scrollRef: "Auto-scroll while dragging inside this element",
  a11y: "Labels and focus return after a move",
  DndProvider: "Owns the drag session for this tree",
  useSortable: "Registers one sortable item",
};

type ExampleFrameProps = {
  title?: string;
  description?: string;
  badges?: string[];
  hint?: string;
  preview: ComponentChildren;
  code: string;
  class?: string;
  id?: string;
};

export function ExampleFrame({
  title,
  description,
  badges = [],
  hint,
  preview,
  code,
  class: className = "",
  id,
}: ExampleFrameProps): JSX.Element {
  const [notice, setNotice] = useState<DemoNotice>(IDLE_NOTICE);
  const [codeOpen, setCodeOpen] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);
  const setReset = useCallback((reset: (() => void) | null) => {
    resetRef.current = reset;
  }, []);
  const api = useMemo<FrameApi>(
    () => ({ notice, setNotice, setReset }),
    [notice, setNotice, setReset],
  );

  const titleId = id ? `${id}-title` : undefined;
  const codeId = id ? `${id}-code` : undefined;
  const statusText = notice.tone === "idle" ? (hint ?? "") : notice.text;
  const statusClass =
    notice.tone === "reject"
      ? "text-sm font-medium text-brand-hover"
      : notice.tone === "move"
        ? "text-sm font-medium text-foreground"
        : "text-sm text-muted-foreground";

  return (
    <ExampleFrameContext.Provider value={api}>
      <section
        id={id ? `${id}-example` : undefined}
        aria-labelledby={titleId}
        class={`scroll-mt-[calc(var(--docs-header-height)+1rem)] overflow-visible rounded-xl border border-border bg-card ${className}`}
      >
        {(title || description || badges.length > 0) && (
          <header class="space-y-2 border-b border-border px-4 py-4 sm:px-5">
            {title ? (
              <h3 id={titleId} class="m-0 text-base font-semibold text-foreground">
                {title}
              </h3>
            ) : null}
            {description ? (
              <p class="m-0 text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
            {badges.length > 0 ? (
              <ul class="m-0 flex list-none flex-wrap gap-2 p-0">
                {badges.map((badge) => (
                  <li key={badge}>
                    <span
                      title={BADGE_TITLES[badge] ?? badge}
                      class="inline-flex rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      {badge}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>
        )}
        <div class="docs-demo-canvas m-3 overflow-visible rounded-lg p-4 sm:m-4 sm:p-5">
          {preview}
        </div>
        <div class="flex items-start justify-between gap-3 border-t border-border px-4 py-3">
          <p
            class={`m-0 min-h-5 flex-1 ${statusClass}`}
            aria-live={notice.tone === "idle" ? "off" : "polite"}
          >
            {statusText}
          </p>
          <button
            type="button"
            class="inline-flex min-h-9 shrink-0 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
            aria-label={title ? `Reset ${title}` : "Reset example"}
            onClick={() => resetRef.current?.()}
          >
            Reset
          </button>
        </div>
        <CodePreview
          code={code}
          class="border-t border-border"
          collapsed={!codeOpen}
          bodyId={codeId}
          actions={
            <button
              type="button"
              class="inline-flex min-h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted"
              aria-expanded={codeOpen}
              aria-controls={codeId}
              onClick={() => setCodeOpen((open) => !open)}
            >
              {codeOpen ? "Hide code" : "Show code"}
            </button>
          }
        />
      </section>
    </ExampleFrameContext.Provider>
  );
}
