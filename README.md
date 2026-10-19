<p align="center">
  <img src=".github/assets/logo-kamod-dnd-dark.svg#gh-light-mode-only" alt="Kamod DnD" width="280" />
  <img src=".github/assets/logo-kamod-dnd-light.svg#gh-dark-mode-only" alt="Kamod DnD" width="280" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@kamod-ch/dnd"><img src="https://img.shields.io/npm/v/%40kamod-ch%2Fdnd" alt="npm version" /></a>
  <a href="https://github.com/kamod-ch/kamod-dnd/stargazers"><img src="https://img.shields.io/github/stars/kamod-ch/kamod-dnd?style=social" alt="GitHub stars" /></a>
  <a href="https://github.com/kamod-ch/kamod-dnd/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" /></a>
</p>

<p align="center">
  <strong><a href="https://www.npmjs.com/package/@kamod-ch/dnd">npm</a></strong> ·
  <strong><a href="https://github.com/kamod-ch/kamod-dnd">GitHub</a></strong> ·
  <strong><a href="https://github.com/kamod-ch/kamod-dnd/issues">Issues</a></strong>
</p>

> If Kamod DnD saves you time, **[star the repo](https://github.com/kamod-ch/kamod-dnd)** — it helps others discover the project.

# Kamod DnD

Headless Preact drag-and-drop for sortable lists and cross-container transfers (editor blocks, Kanban). Built on [Pragmatic Drag and Drop](https://atlassian.design/components/pragmatic-drag-and-drop/) (Apache-2.0). Your app owns domain data; the library owns the ephemeral drag session and emits `MoveIntent` on drop and via keyboard helpers.

```tsx
import { DndProvider, type MoveIntent } from "@kamod-ch/dnd";
import { applyMoveIntentToIds, useSortable, useSortableContainer } from "@kamod-ch/dnd/sortable";
import { useState } from "preact/hooks";

export function List() {
  const [order, setOrder] = useState(["a", "b", "c"]);
  const onMove = (intent: MoveIntent) => {
    setOrder((prev) => applyMoveIntentToIds({ list: prev }, intent).list);
    return true;
  };
  return (
    <DndProvider onMove={onMove}>
      <SortableList order={order} />
    </DndProvider>
  );
}
```

Peer dependencies: `preact`, `@preact/signals`.

## Install

```bash
pnpm add @kamod-ch/dnd @preact/signals preact
```

## Documentation

Interactive PreactPress examples and guides live in `packages/docs`:

```bash
pnpm docs:dev    # http://localhost:5173
pnpm docs:build
```

## API (MVP)

- `DndProvider` — `onMove`, optional `dropRule`, `locale`, `scrollRef`, `reducedMotion`
- `useDndState`, `useDraggable`, `useDroppable`
- `useSortable`, `useSortableContainer`, `applyMoveIntentToIds` from `@kamod-ch/dnd/sortable`
- **`@kamod-ch/dnd/tree`** (opt-in) — helpers for container-per-parent hierarchies (`treeToContainers`, `applyTreeMove`, keyboard indent/outdent projection). Same `MoveIntent` contract; pair with separate row vs child-list refs (see `spikes/tree-spike`).
- Target index is **after removing** the item from the source container.

## Examples

```bash
pnpm install
pnpm --filter @kamod-dnd/example-editor-blocks dev
pnpm --filter @kamod-dnd/example-kanban dev
```

Vite demos use `@kamod-ch/themes/theme.css` and `@kamod-ch/ui/button` where helpful.

## SSR

Safe to import the package without DOM; mount `DndProvider` only on the client.

## Development

| Command              | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `pnpm check`         | normal gate: typecheck, format, lint, test, build, docs integrity |
| `pnpm check:release` | full gate: check, docs build, browser, tree, packed consumer      |
| `pnpm test:browser`  | Playwright against editor and Kanban examples                     |
| `pnpm docs:dev`      | PreactPress docs + live demos                                     |
| `pnpm qa:tarball`    | pack + isolated consumer smoke                                    |

## Scope

**In scope:** vertical lists, transfers (including empty targets), handle-only pointer drag, escape cancel, keyboard moves, localized announcements.

**Not in MVP:** grids, virtualization, file/cross-window DnD.

**Trees (opt-in):** import `@kamod-ch/dnd/tree` and model each parent’s children as a container id. Pointer reparent uses nested drop-target selection in the engine; touch and screen-reader certification are still manual ([`docs/a11y-manual-checklist.md`](docs/a11y-manual-checklist.md), [`docs/tree-evaluation.md`](docs/tree-evaluation.md)).

Manual verification for touch devices and screen readers: [`docs/a11y-manual-checklist.md`](docs/a11y-manual-checklist.md).
