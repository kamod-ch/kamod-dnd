# kamod-dnd / @kamod-ch/dnd

Headless Preact library for sortable lists and cross-container transfers (editor blocks, Kanban). Built on [@atlaskit/pragmatic-drag-and-drop](https://atlassian.design/components/pragmatic-drag-and-drop/) (Apache-2.0).

## Install

```bash
pnpm add @kamod-ch/dnd @preact/signals preact
```

Peer dependencies: `preact`, `@preact/signals`.

## Minimal example

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
      <Container order={order} />
    </DndProvider>
  );
}
```

Domain data stays in your app; the library owns only the ephemeral drag session and emits `MoveIntent` on drop (and via keyboard helpers).

## API (MVP)

- `DndProvider` – instance-scoped controller, `onMove`, optional `dropRule`, `locale`, `scrollRef`, `reducedMotion`
- `useDndState`, `useDraggable`, `useDroppable`
- `useSortable`, `useSortableContainer`, `applyMoveIntentToIds` from `@kamod-ch/dnd/sortable`
- Target index is **after removing** the item from the source container.

## Examples

```bash
pnpm install
pnpm --filter @kamod-dnd/example-editor-blocks dev
pnpm --filter @kamod-dnd/example-kanban dev
```

Kamod UI/theme imports: `@kamod-ch/themes/theme.css`, `@kamod-ch/ui/button`.

## SSR

Safe to import the package without DOM; mount `DndProvider` only on the client.

## Scripts

| Command                                | Purpose                              |
| -------------------------------------- | ------------------------------------ |
| `pnpm check`                           | typecheck, format, lint, test, build |
| `pnpm test:browser`                    | Playwright against editor example    |
| `node scripts/qa-tarball-consumer.mjs` | pack + isolated consumer smoke       |

## Scope & limits

Implemented: vertical lists, transfers including empty targets, handle-only pointer drag, escape cancel, basic keyboard moves, localized announcement hooks.

Not in MVP: grids, trees, virtualization, file/cross-window DnD.

Manual verification still required for real touch devices and screen readers (`docs/a11y-manual-checklist.md`).

## Kamod UI integration

Keep `@kamod-ch/dnd` in feature packages; copy patterns from `examples/` into Kamod UI apps without coupling the runtime package to Tailwind.
