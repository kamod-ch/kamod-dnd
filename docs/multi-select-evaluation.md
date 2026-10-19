# Multi-select evaluation

**Decision: GO WITH EXTENSION**

Add a separate `BatchMoveIntent<TData>` and leave `MoveIntent<TData>` as one item. `itemId` stays a single id. Selection stays application state. The library does not own the lists.

This spike does not add that type to `@kamod-ch/dnd`. `packages/core/src/**` is unchanged. Plan 011's manual screen-reader and touch matrix is still open.

## What was compared

`MoveIntent` is `{ kind: "move"; itemId: DndId; sourceContainerId; targetContainerId; targetIndex; data }`. `targetIndex` is the slot after that one id is removed. `dropRule`, the live region, and focus all follow that one id.

Three ways to move several cards:

1. A new `BatchMoveIntent` with `kind: "batch"`, `itemIds` in stable order, one `targetContainerId`, and a `targetIndex` counted after every selected id is removed.
2. A list of today's `MoveIntent` values committed one after another.
3. Application-only orchestration, with no new core type.

(2) is rejected. `applyMoveIntentToIds` on `a` into `done`, then a later rejection of `d`, leaves `a` already in `done`. The batch helper returns `null` and the original lists stay put. Indexes also shift once the first id has moved, so the second intent's index is no longer the slot the user aimed at.

(3) can update the lists. The kanban spike does that today: `onMove` still receives one `MoveIntent`, and the application expands it into one `commitBatch` or returns `false` before any `setState`. Atomicity does not require library-owned domain state. The session still announces, focuses, and drop-rules only the dragged card. A public multi-select claim needs the batch intent so those three follow the group.

## Batch contract the spike validated

`spikes/multi-select-spike/src/batch.ts` keeps this shape local:

- `itemIds` follow the caller's container order, then each container's current order. Ids are not sorted by click order.
- `targetIndex` counts ids that remain after the whole selection is removed. `batchIndexFromSingle` converts the engine's single-item index into that coordinate, including when another selected id already sits in the destination.
- `commitBatch` runs one predicate per member. Any `false`, any missing id, or an empty selection returns `null` and does not write a new order.
- A blocked title (`"blocked release"` into Done) rejects `c1` and `c4` together. Replaying two single intents would have left `c1` in Done.

Multi-source order is the column order `todo`, then `doing`, then `done`. Dragging `c1` and `c3` into empty Done commits `c1, c3`.

## Kanban fixture

`spikes/multi-select-spike` uses `DndProvider`, `useSortable`, `useSortableContainer`, and `applyMoveIntentToIds` for a card that is not part of a group. Checkboxes and "Move selection to …" buttons are the keyboard path. No pointer modifier is required.

Playwright Chromium, Firefox, and WebKit cover:

- Non-contiguous pointer reorder in To do: `c1` and `c4` dropped after `c2` become `c2, c1, c4`.
- Pointer transfer of `c1` and `c3` into empty Done, leaving To do as `c2, c4` and Doing empty.
- A group that includes the blocked card does not change any column, and the library says `Cancelled moving Write spec.`
- Keyboard move of `c1` and `c2` to Doing appends them after `c3` and focuses `handle-c1`.
- Undo restores the previous orders.
- Escape during the drag leaves To do unchanged.
- Deselecting a card that is not under the pointer shrinks the batch to the ids still selected.
- Deselecting the dragged card rejects the batch.
- An unselected card still moves by itself through `MoveIntent`.
- The group live region says `Picked up 2 cards: …` and `Moved N cards to …`.

The library live region still names only the dragged card. That is the gap the extension closes.

## Migration cost

A follow-up minor version would:

1. Export `BatchMoveIntent<TData>` next to `MoveIntent<TData>`. Existing `onMove` and `dropRule` callbacks keep the single-item signature.
2. Add an optional `onBatchMove` and a per-member rule. The application still applies the returned orders. Any member rejection cancels the session with `rejected` and skips `onBatchMove`.
3. Announce the count and the member labels, and focus `itemIds[0]` after an accepted batch. Single-item focus and copy stay as they are.
4. Document the index as "after the whole set is removed" and the stable order as container order, then in-container order.

No major bump is required, because `MoveIntent.itemId` does not become an array and single-item behavior stays on the current path.
