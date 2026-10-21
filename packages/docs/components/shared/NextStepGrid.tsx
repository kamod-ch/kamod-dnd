import type { JSX } from "preact";

export type NextStepItem = {
  href?: string;
  title: string;
  description: string;
  external?: boolean;
  paths?: string[];
};

type NextStepGridProps = {
  items: NextStepItem[];
  class?: string;
};

export function NextStepGrid({ items, class: className = "" }: NextStepGridProps): JSX.Element {
  return (
    <div class={`not-prose my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {items.map((item) => {
        const body = (
          <>
            <h3 class="m-0 text-base font-semibold text-foreground group-hover:text-brand">
              {item.title}
            </h3>
            <p class="m-0 mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
            {item.paths && item.paths.length > 0 ? (
              <div class="mt-3 flex flex-wrap gap-1.5">
                {item.paths.map((path) => (
                  <code
                    key={path}
                    class="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-xs text-foreground"
                  >
                    {path}
                  </code>
                ))}
              </div>
            ) : null}
            {item.href ? (
              <span
                class="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand group-hover:text-brand-hover"
                aria-hidden="true"
              >
                {item.external ? "Open" : "Explore"}
                <span class="transition-transform group-hover:translate-x-0.5">→</span>
              </span>
            ) : null}
          </>
        );

        if (!item.href) {
          return (
            <article
              key={item.title}
              class="flex h-full flex-col rounded-xl border border-border bg-muted/25 p-4"
            >
              {body}
            </article>
          );
        }

        return (
          <a
            key={item.title}
            href={item.href}
            class="group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-brand/40 hover:bg-muted/20"
            {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {body}
          </a>
        );
      })}
    </div>
  );
}
