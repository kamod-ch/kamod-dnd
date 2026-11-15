import type { ComponentChildren, JSX } from "preact";
import { CopyButton } from "./CopyButton";
import { HighlightedCode } from "./highlight-tsx";

type CodePreviewProps = {
  code: string;
  language?: string;
  class?: string;
  title?: string;
  actions?: ComponentChildren;
  collapsed?: boolean;
  bodyId?: string;
};

export function CodePreview({
  code,
  language = "tsx",
  class: className = "",
  title,
  actions,
  collapsed = false,
  bodyId,
}: CodePreviewProps): JSX.Element {
  return (
    <div class={`overflow-hidden bg-card text-card-foreground ${className}`}>
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div class="flex items-center gap-2">
          {title ? <span class="text-sm font-medium">{title}</span> : null}
          <span class="rounded-md bg-muted px-2 py-0.5 font-mono text-[0.7rem] text-muted-foreground">
            {language}
          </span>
        </div>
        <div class="flex items-center gap-2">
          {actions}
          <CopyButton value={code} />
        </div>
      </div>
      <div id={bodyId} class={`relative ${collapsed ? "max-h-40 overflow-hidden" : ""}`}>
        <pre class="m-0 overflow-x-auto p-4 font-mono text-[0.8125rem] leading-relaxed">
          <HighlightedCode code={code} />
        </pre>
        {collapsed ? (
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
