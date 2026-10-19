# Layout strategy evaluation

**Decision: horizontal-only extension**

Horizontal lists get an optional `orientation: "vertical" | "horizontal"` on the sortable container. The default stays `"vertical"`. Logical before/after is that axis plus the container element's `dir`. `MoveIntent` stays one item and one index. Consumers keep source order.

Grids stay a separate later feature. A general strategy object that projects every pointer into one index is rejected: folding a grid into the same prop would make a vertical list's hit testing ambiguous.

This spike does not add orientation to `@kamod-ch/dnd`. `packages/core/src/**` is unchanged. Plan 011's manual screen-reader and touch matrix is still open; the spike only exercises the shipped API plus a spike-local adapter.

## Contracts compared

The engine today attaches only `top` and `bottom`, and maps a container hit to `bottom` (`packages/core/src/engine/pragmatic/bindings.ts`). `indexAfterRemoval` accepts only those two edges. `README.md` excludes grids. No public prop names an orientation, a writing direction, or a layout strategy.

Two contracts were compared on the same fixtures:

1. `orientation: "vertical" | "horizontal"` with logical before/after. Vertical before/after stays top/bottom. Horizontal LTR before/after is left/right. Horizontal RTL before/after is right/left. The ids are never reversed. The logical edge is then passed to `indexAfterRemoval` as `top` (before) or `bottom` (after), so the committed value is still one index.
2. A general strategy object that projects pointer and keyboard input onto an index. The spike's `projectPointer` is that projection for a single axis. Using it as the public contract would also be the place a grid, a wrapped row, or a freeform layout reports an index. One index cannot name both "the next cell" and "the cell below" at the same time, so a shared strategy makes vertical hit testing ambiguous.

The selected contract is (1). Contract (2) remains an internal adapter for the horizontal case only.

## Fixtures

`spikes/layout-strategy-spike` renders horizontal LTR, horizontal RTL (`dir="rtl"` on the section and the bar), a vertical list, a second horizontal list, an empty target, a 12-item horizontal scroller, a 2-column uniform grid, and a variable grid whose first cell spans both columns. Drag behavior uses `DndProvider`, `useSortable`, `useSortableContainer`, `tryCommitMove`, and `scrollRef`. The horizontal pointer path replaces `targetIndex` inside `onMove` with `projectPointer`, which reads live element rects. Keyboard before/after calls `tryCommitMove` with `indexForLogicalEdge`. Grids are display-only and publish `data-after` and `data-below`.

Playwright Chromium, Firefox, and WebKit (Desktop profile, 1280×900) cover:

- LTR pointer: `ltr-a` dropped on the visual end of `ltr-c` becomes `ltr-b, ltr-c, ltr-a`, and the DOM order matches.
- RTL: DOM order stays `rtl-a, rtl-b, rtl-c` while `rtl-a` is painted to the right of `rtl-c`. Logical After on `rtl-a` commits `rtl-b, rtl-a, rtl-c`, and `rtl-a` is then painted to the left of `rtl-b`.
- Vertical pointer reorder uses the engine index unchanged.
- `left-a` transfers onto the end of the other horizontal list, and `left-b` transfers into the empty target.
- Before on the first item and After on the last item leave the LTR order unchanged.
- Uniform grid: `g-b` reports `data-after="g-c"` and `data-below="g-d"`.
- Spanned grid: `wide` reports `data-after="span-left"` and `data-below="span-left,span-right"`.

## Horizontal autoscroll

Production `scrollRef` registers `@atlaskit/pragmatic-drag-and-drop-auto-scroll` 2.1.5. That package depends on `@atlaskit/pragmatic-drag-and-drop` ^1.7.0. `@kamod-ch/dnd` dispatches drags through pragmatic ^4.0.0. Those are different monitors, so the 2.x registration does not receive drag frames.

With only `scrollRef`, resting the pointer on the end edge of a 220px-wide overflowing strip left `scrollLeft` at 0 in Firefox and WebKit. Chromium moved `scrollLeft` on its own. The strip's `scrollWidth` was about 2,600–2,900px against a `clientWidth` of 220px, and assigning `scrollLeft` during the drag stuck, so the element can scroll.

The spike also registers `@atlaskit/pragmatic-drag-and-drop-auto-scroll` 3.2.1, which depends on pragmatic ^4.0.0, on that same element. `scrollLeft` then passes 20 in Chromium, Firefox, and WebKit while the pointer rests in the end-edge hitbox (`clientWidth - 24`, inside the package's 25% edge).

## Migration cost

A follow-up implementation plan would:

1. Add `orientation?: "vertical" | "horizontal"` on the sortable container, defaulting to `"vertical"`, so current lists keep top/bottom edges.
2. When `orientation` is `"horizontal"`, attach `left` and `right`, read `dir` from the container element, and map logical before/after onto the existing `indexAfterRemoval` edges (`before` → `top`, `after` → `bottom`). `MoveIntent.targetIndex` stays a number. Callers do not reverse their arrays.
3. Drive keyboard before/after through the same logical edge. The first and last positions stay no-ops.
4. Bump `@atlaskit/pragmatic-drag-and-drop-auto-scroll` from 2.1.5 to 3.x so `scrollRef` shares the pragmatic 4 monitor. Until that bump, Firefox and WebKit do not autoscroll an overflow port from `scrollRef`.

Grids are out of that plan. `index + 1` and the cell below already disagree on a 2-column grid (`b` is followed by `c` in the array and by `d` visually). A span of 2 has one array successor and two cells beneath it. A later grid feature needs its own subpath and a way to name more than one visual neighbor. It does not fit behind `orientation`.
