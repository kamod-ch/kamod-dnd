# Tree support evaluation (decision spike)

Stand: 2026-10-19. Scope: **spike only** — **trees remain unsupported** by the published `@kamod-ch/dnd` package.

## Commands and results

| Command                                         | Result                         |
| ----------------------------------------------- | ------------------------------ |
| `pnpm --filter @kamod-dnd/spike-tree test`      | 9/9 Vitest tests passed        |
| `pnpm --filter @kamod-dnd/spike-tree typecheck` | exit 0                         |
| `pnpm --filter @kamod-dnd/spike-tree build`     | exit 0 (Vite production build) |
| `pnpm --filter @kamod-dnd/spike-tree test:e2e`  | 5/5 Chromium tests passed      |
| `pnpm typecheck`                                | exit 0 (includes spike)        |
| `pnpm lint`                                     | exit 0                         |

Evidence lives in `spikes/tree-spike/` (model, UI fixture, `e2e/tree.spec.ts`). No `packages/core/src/**` changes.

## Capability matrix

| Capability                         | Classification                 | Evidence                                                                                                            |
| ---------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Sibling reorder                    | **Public API + adapter**       | `MoveIntent` + `applyMoveIntentToIds`; model + keyboard + E2E                                                       |
| Reparent (app adapter)             | **Adapter logic**              | `treeToContainers` / `applyTreeMove`; Vitest + keyboard E2E                                                         |
| Empty parent drop zone             | **Adapter logic**              | Move `g1` → `rB` child list (Vitest + E2E button path)                                                              |
| Root transfer                      | **Adapter logic**              | Vitest root ↔ child moves                                                                                           |
| Subtree preservation               | **Adapter logic**              | Child lists keyed by node id; parent move keeps `nodes[id].childIds`                                                |
| Cycle prevention                   | **Adapter logic**              | `validateTreeMove` rejects descendant targets; E2E cycle button                                                     |
| Nested target precedence (pointer) | **Blocked — engine signal**    | Playwright `dragTo` over `children-c1` did **not** reparent `c2`; sibling parent unchanged (see `e2e/tree.spec.ts`) |
| Keyboard indent/outdent            | **Adapter logic (not public)** | `projectKeyboardMove` in spike; E2E indent/outdent                                                                  |
| Semantic ARIA tree markup          | **Adapter / fixture**          | `role="tree"`, `treeitem`, `group`, `aria-level`, `aria-expanded` in spike UI; E2E asserts levels                   |
| Auto-expand on drag hover          | **Not evaluated**              | No API or spike behavior                                                                                            |
| Touch                              | **Not evaluated**              | Follow-up before public claim                                                                                       |
| Screen reader verification         | **Not evaluated**              | VoiceOver/NVDA manual work required (`docs/a11y-manual-checklist.md`)                                               |

## Is `MoveIntent` sufficient?

**As a low-level mutation contract: yes**, when each parent’s ordered children are modeled as a container id (parent node id or spike-local root sentinel) and **target index after source removal** is preserved.

**As a complete tree interaction contract: no.** Indent/outdent, cycle validation, and hierarchy bookkeeping are **application adapter** concerns. Pointer reparenting into a **nested child drop zone** did not produce the intended move with the current engine rule `location.current.dropTargets[0]` (`packages/core/src/engine/pragmatic/bindings.ts`) — the spike records sibling-level behavior for that pointer case.

Data representation (normalized adjacency in the spike) is separable from interaction semantics; production need not force this adjacency shape if a future plan chooses flattened visible rows instead.

## Production seams (evaluate only — not implemented)

| Seam                            | File / symbol                                                        | Why                                                        |
| ------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| Drop target ordering / metadata | `packages/core/src/engine/pragmatic/bindings.ts` (`dropTargets[0]`)  | Nested container vs item precedence for pointer reparent   |
| Session snapshot for trees      | `packages/core/src/session/types.ts`, `useDndState`                  | Expose enough target context for adapters without guessing |
| Keyboard tree actions           | `packages/core/src/accessibility/keyboard.ts` (`KeyboardMoveAction`) | Only up/down/transfer today — no indent/outdent            |
| Localized tree announcements    | `packages/core/src/accessibility/messages.ts`                        | Reparent / depth language                                  |
| Optional tree subpath           | New `@kamod-ch/dnd/tree` (future)                                    | Keep list MVP exports stable                               |

## Recommendation

**GO WITH CORE EXTENSION**

Implement a dedicated **`@kamod-ch/dnd/tree` subpath** (follow-up plan) on top of **unchanged `MoveIntent`**, but **narrowly extend** engine/session drop-target reporting (or documented hitbox strategy) so pointer reparent into nested child containers is reliable before any public tree claim.

Rationale:

- Pure model + keyboard paths validate reorder, reparent, cycles, and subtree preservation using **public** `applyMoveIntentToIds`.
- Pointer nested reparent **failed** in Chromium E2E with the current “first drop target wins” engine behavior — not safe to ship trees without a core signal fix or officially documented workaround.
- A tree-only subpath avoids polluting `useSortable` with hierarchy options.

**Not chosen:** **GO** (pointer gap blocks honest GO); **NO-GO** (contract is reusable; gap is localized to targeting, not `MoveIntent` shape).

## Proposed production API sketch (non-public, subject to follow-up plan)

```ts
// @kamod-ch/dnd/tree — illustrative only, not shipped
export type TreeMoveAdapter<TNode> = {
  toContainers(state: unknown): Record<string, string[]>;
  fromContainers(state: unknown, containers: Record<string, string[]>): unknown;
  validateMove(state: unknown, intent: MoveIntent<TNode>): string | null;
  projectKeyboard(
    state: unknown,
    itemId: string,
    action: "up" | "down" | "indent" | "outdent",
  ): MoveIntent<TNode> | null;
};
```

Prefer recursive **container-per-parent** rendering (as in the spike) or document an alternative flattened-row architecture explicitly in the implementation plan — do not assume this spike validated flattened-row pointer projection.

## Follow-up before public “tree support”

- Fix or specify nested drop-target precedence; re-run pointer E2E across Chromium/Firefox/WebKit.
- Multi-browser matrix and touch devices (manual + automated where possible).
- VoiceOver/NVDA sessions for reparent announcements and focus order.
- Package export, docs, examples, and release notes only after the above.

**Trees remain unsupported** in `@kamod-ch/dnd` until that follow-up ships.

---

## Plan 002 addendum (2026-10-19)

Plan 002 shipped:

- **`pickActiveDropTarget`** in `packages/core/src/engine/pragmatic/drop-target.ts` replaces blind `dropTargets[0]` in `bindings.ts`.
- **`@kamod-ch/dnd/tree`** export (`dist/tree.js`) with helpers ported from the spike.
- Spike E2E: pointer reparent **`c2` → parent `c1`** passes (Chromium) using handle-to-handle pointer paths; nested empty child zones still require aiming at item handles or empty shells, not the whole `children-*` bounding box.
- **`pnpm test:browser`**: 24/24 pass (editor + kanban, Chromium/Firefox/WebKit).

Trees are **opt-in** via `@kamod-ch/dnd/tree`. Touch/SR certification and multi-browser tree matrix remain follow-ups before a public “full tree a11y” claim.
