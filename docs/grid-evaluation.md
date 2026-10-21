# Grid layout evaluation

**Decision: DEFER — separate subpath (`@kamod-ch/dnd/grid`), not `orientation`**

Stand: 2026-10-21. Follow-up to [layout-strategy-evaluation.md](layout-strategy-evaluation.md).

## Why not extend `orientation`

Uniform and spanned grids in [spikes/layout-strategy-spike](spikes/layout-strategy-spike) already disagree with a single 1D index:

- Row-major `index + 1` is not always the cell below.
- Col-span cells have multiple visual successors.

`MoveIntent.targetIndex` remains list-oriented. Grids need either row-major mapping documented for **uniform** grids only, or a grid-specific intent — out of scope for 0.4.

## Next spike steps (0.6+)

1. Vitest fixtures from `layout-strategy-spike` grid sections (`data-after` / `data-below`).
2. Prototype `@kamod-ch/dnd/grid` exporting `projectGridMove` → `MoveIntent` for uniform N×M only.
3. No public grid API until pointer + keyboard paths pass Playwright on a minimal demo.

## Non-goals

- Freeform masonry
- Cross-window / file drops
