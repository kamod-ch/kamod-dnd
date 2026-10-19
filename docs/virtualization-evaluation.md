# Virtualization evaluation

**Decision: GO WITH EXTENSION**

The current public API can drive a virtualized vertical list for rows that stay mounted. It cannot honestly claim virtualization support until two seams exist: the active item must survive being unmounted, and a container hit must be able to name an index that has no DOM node.

This spike does not add virtualization to `@kamod-ch/dnd`. `packages/core/src/**` is unchanged. Plan 011's manual screen-reader and touch matrix is still open; the spike only exercises the shipped API.

## Virtualizer

`@tanstack/virtual-core` **3.19.6**, MIT, published 2026-10-16. It has no runtime dependencies and no React peer. The spike wraps `Virtualizer` in Preact (`spikes/virtualization-spike/src/use-virtualizer.ts`) and passes `elementScroll`, `observeElementRect`, and `observeElementOffset` from the same package.

`@tanstack/react-virtual` was rejected because it requires React. A second virtualizer would not remove the gaps below: both gaps are in item registration and `indexAfterRemoval`, which run before any virtualizer sees the pointer.

## Fixture

`spikes/virtualization-spike` renders a 10,000-row list (1,000 in the smaller benchmark) with stable ids `row-0`…, row heights of 30–80px, and a 500px scrollport. A second 40-row virtual list and an empty container sit beside it. All drag behavior uses `DndProvider`, `useSortable`, `useSortableContainer`, `tryCommitMove`, and `scrollRef`.

## What the public API already does

- A 10k list mounts 19 rows. `row-500` is not in the document.
- Reordering two mounted rows commits a `MoveIntent` and changes the index.
- A mounted row can move into the other virtual list and into the empty container.
- Escape cancels and leaves the index unchanged.
- Keyboard "Down" on a mounted row moves it and focuses its handle. The live region says `Item 0`.
- `tryCommitMove` to index 500, followed by `scrollToIndex(500)`, commits an index that was not mounted and then focuses `handle-row-0` after that row is scrolled into view.
- Unmounting the list removes the scrollport and the mounted rows.

## Gaps

**Unmounted destination.** For pointer offset of index 500 while the mounted window is the first rows, `unmountedDropGap` reports `visual 500`, `library 10000`, `destination-mounted false`. `indexAfterRemoval` with no `overId` appends at `ids.length`. The browser test renders that string from the live window. No fake drop target is inserted for the missing row.

**Autoscroll.** `scrollRef` does scroll the 500px port (`scrollTop` passes 200, and the scroll height is about 470,000px). Once the source row leaves the mounted window, `unregisterItem` cancels the drag with the source removed. The index stays 0 and `row-0` is gone. A long autoscroll cannot be completed onto a newly mounted row, because the source element is gone before the drop.

**Release timing.** A pointer release commits the last hover the engine has already published. The tests wait until the live region names the destination before mouseup. Releasing earlier can commit the previous same-container index.

## Metrics

Playwright Chromium 156.0.8078.4 (Desktop Chrome profile, 1280×900). Host: Linux 7.0.0-113038-tuxedo, 20 cores. One drag of `row-0` onto the mounted `row-3` handle after the live region names a new position. `longtask` entries longer than 50ms were recorded with `PerformanceObserver`; this Chromium reported none.

| Rows  | Mounted before | Mounted after | Row renders during the drag | Long tasks (ms) | Pointer down to up |
| ----- | -------------- | ------------- | --------------------------- | --------------- | ------------------ |
| 1000  | 19             | 19            | 96                          | none            | 58ms               |
| 10000 | 19             | 19            | 96                          | none            | 52ms               |

Row renders count every render of a mounted row, including hover updates. They do not grow with list length. These numbers are one Chromium run of `e2e/metrics.spec.ts`, not a statistical claim.

## Minimal next seam

A follow-up implementation plan would add two extension points and leave `MoveIntent` as a single item:

1. Keep the active item registered when its element unmounts, until drop or cancel, so autoscroll can reveal a destination without `source-removed`.
2. Let the application project a container hit to an index (`getContainerDropIndex(containerId, clientY)`) so a pointer over unmounted space does not always append.

Until both exist, virtualization stays outside the supported API.
