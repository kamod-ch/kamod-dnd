# Changelog

## 0.4.3 – 2026-11-15

- **Virtual drag pin:** `DndProvider` keeps a hidden drag source while the active row unmounts; Pragmatic binding moves to the pin so autoscroll does not cancel detached virtual rows.
- **Direction:** `readDirection` honors computed `direction`; container `dir`/`style` mutations refresh registered direction; keyboard uses container registration direction first.
- **Tests:** ghost portal, pointer delay, `getDropIndex`, horizontal RTL, tree up/down, pinned drag unit test.

## 0.4.2 – 2026-11-15

Correctness and drag-hover performance (no API break).

- **Keyboard:** sortable handle arrows advance from `previewIndex`, so multi-step reorder in one session works.
- **Index:** same-container container hits use post-removal end index (`length - 1`), not `length`.
- **Pointer drop:** `onDrop` applies the final drop-target list before `handleDrop` commits.
- **`handleDrop`:** `onMove` throw or sync session cancel yields a single terminal state (no stuck `dropping` or drop after cancel).
- **Batch:** `tryCommitBatch` respects `dropRule` when `batchDropRule` is omitted; rejects missing `onBatchMove` and members not in registered orders.
- **Performance:** item-state subscriptions notify only when `isDragging` / `isOver` change; `DragGhostPortal` skips redundant rect updates; perf-list rows memoized; [drag-lists.md](docs/performance/drag-lists.md) re-measured.
- **DX:** [AGENTS.md](AGENTS.md); evaluation docs superseded banners; drop unused `@typescript/typescript6` devDependency.

## 0.4.1 – 2026-10-21

- Erste Veröffentlichung von `@kamod-ch/dnd` auf npm mit dem Funktionsumfang von 0.4.0.

## 0.4.0 – 2026-10-21

Roadmap after 0.3 (line 68).

- **Batch:** `BatchMoveIntent`, `commitBatchMove`, `batchIndexFromSingle`, `stableBatchMembers`, `applyBatchToContainers`; `DndProvider` `onBatchMove` / `batchDropRule`; `controller.tryCommitBatch` + `dropBatch` session event and live-region `droppedBatch`.
- **Pointer activation:** `pointerActivation?: { distance?, delay? }` on `DndProvider`; `canDrag` gate on pragmatic draggable handles.
- **Drag ghost:** headless `DragGhostPortal` + `getItemElement` registry for fixed-position preview.
- **A11y messages:** batch + `reparented` keys; certification log table in `docs/a11y-manual-checklist.md`.
- **Docs:** [grid-evaluation.md](docs/grid-evaluation.md), [ADR 002 React adapter](docs/decisions/002-react-adapter.md), [tree-ga.md](docs/tree-ga.md). Tree subpath remains experimental until manual checklist passes (0.5.0).

## 0.3.0 – 2026-10-21

Must-have quality and extension release (Plan 0.3).

- **Auto-scroll:** bump `@atlaskit/pragmatic-drag-and-drop-auto-scroll` to 3.x so `scrollRef` works with pragmatic 4 in Firefox and WebKit.
- **Performance:** live region announcements moved to `DndAnnouncer` (no provider re-render on every hover); `useSortableItemState` / `useSortableContainerPreview` for selective subscriptions; `useDndState` unchanged for full snapshots.
- **Keyboard:** sortable handles support Space/Enter pick-up/drop and arrow keys within the same container; optional `handleProps` (`touchAction: "none"`, etc.). Existing `moveByKeyboard` buttons kept for transfers.
- **Horizontal:** `orientation: "vertical" | "horizontal"` on `useSortableContainer`; LTR/RTL via container `dir`.
- **Virtualization seams:** `getDropIndex` on container hits; active item **detaches** on row unmount while its id remains in order (pointer source node may still need pinning — see docs).
- Docs: horizontal strip demo, updated examples copy.

## 0.2.0 – 2026-10-19

First publish candidate including hierarchical tree helpers (Plan 002).

- Export `@kamod-ch/dnd/tree` (`dist/tree.js`): `treeToContainers`, `applyTreeMove`, `validateTreeMove`, `projectKeyboardMove`, `DEFAULT_ROOT_CONTAINER_ID`, and related types.
- Engine: `pickActiveDropTarget` replaces blind `dropTargets[0]` for nested container vs item precedence (flat list / Kanban behavior preserved).
- A pointer release uses the final drop-target list. Releasing outside every target cancels, including when an earlier hover had a preview. A drop event that arrives while the pointer button is still down cancels as well.
- Docs: README and PreactPress guide for container-per-parent trees; `spikes/tree-spike` Playwright regression (pointer reparent).
- Example `examples/tree` is the browser reference (Chromium, Firefox, WebKit). Collapsed-parent expansion after a 900ms hover is an example recipe, not a core API.
- **Not included:** core auto-expand, virtualization, grids, flattened-row pointer projection. Tree support stays experimental until VoiceOver, NVDA, iOS, and Android are certified.
- Touch and screen reader use for tree reparent are **not** certified; see `docs/a11y-manual-checklist.md` and `docs/tree-evaluation.md`.

## 0.1.0 – 2026-10-18 (lokal, nicht veröffentlicht)

- Erstes headless Preact-Paket `@kamod-ch/dnd` mit Pragmatic-DnD-Adapter.
- Sortable-Subpath, MoveIntent, Drop-Regeln, Keyboard-Hilfen, Live-Region.
- Editor- und Kanban-Beispiele mit @kamod-ch/ui.
