# Batch accessibility (decision)

**Status:** accepted for 0.5.x

## Decision

Multi-select batch moves use **`announce` from the app** for pickup, hover, and cancel copy. The core announcer emits **`droppedBatch` on successful `dropBatch` only**.

Message keys `pickedUpBatch`, `movedBatchToContainer`, and `cancelledBatch` exist in [`packages/core/src/accessibility/messages.ts`](../packages/core/src/accessibility/messages.ts) for apps and locales. They are not wired automatically because the session tracks a single `activeId`, not a selection set.

## Pattern (Kanban / multi-select spike)

After updating selection state, call:

```tsx
const { announce } = useDndContext();
announce("pickedUpBatch", { count: String(n), items: labels });
```

Same as tree `reparented` cross-parent moves.

## Future

If a production consumer needs library-owned batch hover speech, add an optional `getSelectedItemIds(): DndId[]` (or similar) on `DndProvider` in a minor release. Do not change `MoveIntent.itemId` to an array.
