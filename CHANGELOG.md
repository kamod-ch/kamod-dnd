# Changelog

## 0.2.0 – 2026-10-19

First publish candidate including hierarchical tree helpers (Plan 002).

- Export `@kamod-ch/dnd/tree` (`dist/tree.js`): `treeToContainers`, `applyTreeMove`, `validateTreeMove`, `projectKeyboardMove`, `DEFAULT_ROOT_CONTAINER_ID`, and related types.
- Engine: `pickActiveDropTarget` replaces blind `dropTargets[0]` for nested container vs item precedence (flat list / Kanban behavior preserved).
- Docs: README and PreactPress guide for container-per-parent trees; `spikes/tree-spike` Playwright regression (pointer reparent).
- **Not included:** auto-expand on drag hover, virtualization, grids, flattened-row pointer projection.
- Touch and screen reader use for tree reparent are **not** certified; see `docs/a11y-manual-checklist.md` and `docs/tree-evaluation.md`.

## 0.1.0 – 2026-10-18 (lokal, nicht veröffentlicht)

- Erstes headless Preact-Paket `@kamod-ch/dnd` mit Pragmatic-DnD-Adapter.
- Sortable-Subpath, MoveIntent, Drop-Regeln, Keyboard-Hilfen, Live-Region.
- Editor- und Kanban-Beispiele mit @kamod-ch/ui.
