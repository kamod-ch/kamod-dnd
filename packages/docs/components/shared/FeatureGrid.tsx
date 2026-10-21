import type { JSX } from "preact";

export type FeatureItem = {
  /** Monospace API name shown as the card title */
  code: string;
  description: string;
  tags?: string[];
  /** Span both columns on sm+ grids (e.g. longer copy) */
  wide?: boolean;
};

type FeatureGridProps = {
  items: FeatureItem[];
  class?: string;
};

export function FeatureGrid({ items, class: className = "" }: FeatureGridProps): JSX.Element {
  return (
    <ul
      class={`not-prose my-6 grid list-none gap-3 p-0 sm:grid-cols-2 ${className}`}
      aria-label="Package features"
    >
      {items.map((item) => (
        <li
          key={item.code}
          class={`rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand/35 ${
            item.wide ? "sm:col-span-2" : ""
          }`}
        >
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <code class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold text-foreground">
              {item.code}
            </code>
            {item.tags?.map((tag) => (
              <span
                key={tag}
                class="inline-flex rounded-full border border-border px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
          <p class="m-0 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
