# Tree GA gate

`@kamod-ch/dnd/tree` stays **experimental** in README until manual certification completes.

## Required before removing “experimental”

1. All items in [a11y-manual-checklist.md](a11y-manual-checklist.md) signed off for `@kamod-ch/dnd` **0.4+** (include tree reparent, keyboard indent/outdent, collapsed hover).
2. Core messages include `reparented` ([messages.ts](../packages/core/src/accessibility/messages.ts)); apps may call `announce("reparented", …)` after cross-parent moves.
3. `pnpm check:release` green including tree E2E.

## Target release

**0.5.0** — README/CHANGELOG only after checklist; no API break expected.
