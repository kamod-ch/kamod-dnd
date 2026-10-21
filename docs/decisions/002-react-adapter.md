# ADR 002: React adapter

**Status:** proposed — no implementation until explicit consumer demand.

## Context

`@kamod-ch/dnd` targets Preact 10+ with `@preact/signals`. Kamod UI is Preact-first. Some adopters may request React 18/19.

## Decision

Do **not** ship `@kamod-ch/dnd-react` in 0.4.x.

Document the supported path: Preact + signals, SSR-safe import, mount `DndProvider` on the client.

If demand appears (npm issues, kamod-ui React apps, paid support):

1. Prefer **`preact/compat`** in a thin wrapper package re-exporting hooks with `react` as peer — one implementation, compat shim cost at runtime.
2. Alternative: duplicate hooks for React (`useState`/`useEffect` instead of signals) — higher maintenance, only if compat bundle size or behavior is unacceptable.

## Consequences

- No React peer on core package.
- Grid, batch, and tree subpaths stay Preact-only until an adapter exists.
- Revisit when at least one production React consumer is committed.
