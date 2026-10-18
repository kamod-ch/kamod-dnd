# Plan 001: Validate tree support and define a production-ready tree API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 9d3290f..HEAD -- pnpm-lock.yaml spikes/tree-spike docs/tree-evaluation.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. Also run `git status --short` before
> editing: this plan was authored while `pnpm-lock.yaml` already contained
> unrelated uncommitted documentation/branding dependency changes. Preserve
> those changes exactly and add only the new `spikes/tree-spike` importer.

## Status

- **Priority**: P2
- **Effort**: M (roughly 1–2 days; this is a decision spike, not production tree support)
- **Risk**: MED
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `9d3290f`, 2026-10-19

## Why this matters

The MVP supports flat sortable lists and transfers between containers, while
`README.md` explicitly excludes trees. The existing `MoveIntent` may be able
to represent reparenting when a node's child list is treated as a container,
but the repository has no hierarchy model, cycle protection, subtree tests,
tree keyboard behavior, or proof that nested drop targets work. Build an
isolated spike and write an evidence-based go/no-go decision before changing
the public package. This prevents tree-specific complexity from destabilizing
the list MVP or forcing a premature breaking change to `MoveIntent`.

## Current state

Relevant files and roles:

- `README.md:22,60-65,90-94` — describes the MVP as sortable lists and
  cross-container transfers and explicitly places trees outside MVP scope.
- `packages/core/src/session/types.ts:15-23` — `MoveIntent` contains only item,
  source container, target container, target index, and consumer data.
- `packages/core/src/sortable/hooks.tsx:8-35` — a sortable container registers a
  flat ordered list of item IDs.
- `packages/core/src/sortable/hooks.tsx:101-126` —
  `applyMoveIntentToIds` reorders one list or transfers one ID between lists.
- `packages/core/src/engine/pragmatic/bindings.ts:30-50` — the engine consumes
  `location.current.dropTargets[0]`; nested-target precedence therefore needs
  explicit validation.
- `packages/core/src/accessibility/keyboard.ts:4-54` — keyboard actions support
  up, down, and explicit container transfer, but not indent/outdent.
- `packages/core/tests/move-helpers.test.ts:4-20` — existing pure-test style:
  Vitest `describe`/`it`, direct inputs, exact equality assertions.
- `spikes/pragmatic-spike/` — existing Vite/Preact spike structure and naming
  conventions to copy.
- `docs/engine-evaluation.md` — existing evidence-oriented spike report style.

Current public contract excerpt (`packages/core/src/session/types.ts:15-23`):

```ts
export type MoveIntent<TData = unknown> = {
  readonly kind: "move";
  readonly itemId: DndId;
  readonly sourceContainerId: DndId;
  readonly targetContainerId: DndId;
  /** Index in the target container after removing the item from its source. */
  readonly targetIndex: number;
  readonly data: TData;
};
```

Current flat state helper excerpt (`packages/core/src/sortable/hooks.tsx:101-106`):

```ts
export function applyMoveIntentToIds(
  containers: Record<DndId, DndId[]>,
  intent: MoveIntent,
): Record<DndId, DndId[]> {
  const source = containers[intent.sourceContainerId] ?? [];
  const target = containers[intent.targetContainerId] ?? [];
```

Current nested-target selection (`packages/core/src/engine/pragmatic/bindings.ts:35-43`):

```ts
onDrag: ({ location }) => {
  const target = location.current.dropTargets[0];
  if (!target) {
    return;
  }
  const isContainer = target.data.type === CONTAINER_TYPE;
```

Repository conventions to follow:

- TypeScript is strict, ESM is used, and Preact JSX uses
  `jsxImportSource: "preact"`; copy config shape from
  `spikes/pragmatic-spike/tsconfig.json` and `vite.config.ts`.
- Spike package names use `@kamod-dnd/spike-<name>`.
- Domain data remains controlled by the application; the DnD package emits
  intents and must not own the tree.
- IDs are stable strings. Treat a reserved root container ID as an adapter
  detail in the spike, not a new public constant.
- Target index semantics remain "after source removal."
- Preserve existing list behavior and public exports; this plan must not edit
  `packages/core/src/**`.

Known verification baseline at planning time:

- `pnpm typecheck`: passes.
- `pnpm test`: 3 files and 11 tests pass.
- `pnpm lint`: passes.
- `pnpm format:check`: fails on five pre-existing files (`README.md`,
  `docs/development/roadmap-progress.md`, two docs demo components, and
  `packages/docs/tsconfig.json`). Do not modify those files for this plan;
  use the scoped formatting check below.

## Commands you will need

| Purpose                 | Command                                                                                                                | Expected on success                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Install/update lockfile | `pnpm install`                                                                                                         | exit 0; existing lockfile edits preserved; one new spike importer added |
| Spike typecheck         | `pnpm --filter @kamod-dnd/spike-tree typecheck`                                                                        | exit 0, no errors                                                       |
| Model tests             | `pnpm --filter @kamod-dnd/spike-tree test`                                                                             | all tree model tests pass                                               |
| Spike build             | `pnpm --filter @kamod-dnd/spike-tree build`                                                                            | exit 0; Vite production build completes                                 |
| Spike browser test      | `pnpm --filter @kamod-dnd/spike-tree test:e2e`                                                                         | Chromium tests pass                                                     |
| Workspace typecheck     | `pnpm typecheck`                                                                                                       | exit 0, including the new spike                                         |
| Workspace lint          | `pnpm lint`                                                                                                            | exit 0                                                                  |
| Scoped format           | `pnpm exec oxfmt --check spikes/tree-spike docs/tree-evaluation.md plans/001-validate-tree-support.md plans/README.md` | exit 0                                                                  |

## Scope

**In scope** (the only implementation/evaluation files to modify):

- `spikes/tree-spike/package.json` (create)
- `spikes/tree-spike/tsconfig.json` (create)
- `spikes/tree-spike/vite.config.ts` (create)
- `spikes/tree-spike/playwright.config.ts` (create)
- `spikes/tree-spike/index.html` (create)
- `spikes/tree-spike/src/model.ts` (create)
- `spikes/tree-spike/src/model.test.ts` (create)
- `spikes/tree-spike/src/main.tsx` (create)
- `spikes/tree-spike/e2e/tree.spec.ts` (create)
- `docs/tree-evaluation.md` (create)
- `pnpm-lock.yaml` (preserve all existing changes; add only the new workspace importer/dependency resolution changes)
- `plans/README.md` (status update only)

**Out of scope** (do NOT touch, even though they look related):

- `packages/core/src/**` and `packages/core/tests/**` — the spike evaluates the
  public API; it must not silently become a production implementation.
- `packages/core/package.json` or package exports — do not publish a tree
  subpath before the spike decision.
- Existing examples, docs app, root `README.md`, or changelog — do not claim
  tree support.
- Existing Playwright config/tests — the spike has an isolated Chromium config.
- Virtualization, grids, multi-select drag, file/cross-window DnD, persistence,
  undo/redo, auto-scroll tuning, and drag overlays.
- Fixing the pre-existing repository formatting failures.
- Manual VoiceOver, NVDA, iOS, or Android certification. Record these as
  production follow-ups rather than claiming completion.

## Git workflow

- Branch: `advisor/001-tree-spike`
- The repository has only the initial commit (`9d3290f init`), so no established
  commit-message convention exists. Use concise imperative messages, e.g.
  `Add tree support decision spike`.
- Keep the spike and its evaluation report in one logical commit unless the
  operator requests otherwise.
- Do not push or open a PR unless instructed.
- Before editing `pnpm-lock.yaml`, save `git diff -- pnpm-lock.yaml`; after
  `pnpm install`, confirm the pre-existing diff is still present and inspect
  the new `spikes/tree-spike` importer separately.

## Steps

### Step 1: Scaffold an isolated tree spike

Create `spikes/tree-spike` by matching the structure and compiler conventions
of `spikes/pragmatic-spike`, but consume `@kamod-ch/dnd` through `workspace:*`
rather than importing core source files.

`package.json` requirements:

- Name: `@kamod-dnd/spike-tree`
- Private ESM package.
- Scripts: `dev`, `build`, `typecheck`, `test` (`vitest run`), and `test:e2e`
  (`playwright test`).
- Runtime dependencies: `@kamod-ch/dnd: workspace:*`, `@preact/signals`, and
  `preact`, using versions already present in the workspace.
- Development dependencies: `@playwright/test`, `@preact/preset-vite`,
  `typescript`, `vite`, and `vitest`, using repository-compatible versions.
  Do not add a new DnD engine or tree library.

Configure Playwright locally in `spikes/tree-spike/playwright.config.ts` with:

- `testDir: "e2e"`, one Chromium project, one worker, no retries locally.
- A web server that runs this spike's production build and preview on a new,
  strict port (use `14276`; existing examples use `14273`–`14275`).
- `baseURL: "http://localhost:14276"`.

Run `pnpm install`, preserving the lockfile's pre-existing unrelated edits.

**Verify**:

```bash
pnpm --filter @kamod-dnd/spike-tree typecheck
pnpm --filter @kamod-dnd/spike-tree build
```

Expected: both commands exit 0; the workspace package resolves
`@kamod-ch/dnd` without importing `packages/core/src` directly.

### Step 2: Implement and test a normalized application-owned tree model

In `spikes/tree-spike/src/model.ts`, define the smallest normalized model that
can prove or disprove reuse of `MoveIntent`:

- Stable node IDs and one reserved root container ID local to the spike.
- Node records containing presentation data and ordered child IDs.
- Root-level ordered IDs stored separately or under the root sentinel.
- A conversion from tree state to `Record<DndId, DndId[]>`, where each parent
  node ID identifies its child container.
- A pure `applyTreeMove(state, intent)` function that validates first and then
  delegates list movement to `applyMoveIntentToIds`.
- Pure helpers for `parentOf`, descendant detection, and keyboard projection.

Required invariants:

1. Every non-root node appears in exactly one parent/root child list.
2. Moving a parent moves its entire subtree atomically because descendants
   remain linked to that parent.
3. A node cannot be moved into itself or any descendant.
4. Unknown item/source/target IDs and mismatched source ownership are rejected
   without mutating input state.
5. Root-to-node, node-to-root, sibling reorder, and empty-child-list moves use
   target-index-after-removal semantics.
6. No tree helper mutates the input state.

Define keyboard projection as spike/application logic, not as a public API:

- Up/down reorder among siblings.
- Indent moves a node to the end of the previous sibling's child list.
- Outdent moves a node immediately after its parent in the grandparent/root
  list.
- Invalid boundary actions return no intent.

In `src/model.test.ts`, follow the direct Vitest style from
`packages/core/tests/move-helpers.test.ts`. Add named tests for all six
invariants plus valid/invalid indent and outdent. Explicitly assert that a
cycle attempt returns a rejected result and leaves the original tree deeply
equal to its pre-move value.

**Verify**:

```bash
pnpm --filter @kamod-dnd/spike-tree test
```

Expected: all model tests pass, including sibling reorder, reparent to empty
children, subtree preservation, root transfer, cycle rejection, immutability,
indent, and outdent.

### Step 3: Build a recursive Preact proof using only public DnD APIs

In `spikes/tree-spike/src/main.tsx`, render a controlled two-or-more-level tree
inside `DndProvider`. Use `useSortable` for each node row and
`useSortableContainer` for root and child lists. Every node must expose an
explicit child drop zone, including nodes whose child list is empty; do not
pretend center-drop or horizontal depth projection exists if the current API
cannot provide it.

The fixture must contain:

- At least two root nodes.
- One expanded parent with two children.
- One nested grandchild.
- One leaf with an empty child container.

The UI must provide stable `data-testid` values for nodes, handles, child
containers, and keyboard controls. Render enough debug state to make the last
accepted/rejected intent and current parent relationship observable in E2E
tests. Use semantic tree markup where feasible (`role="tree"`,
`role="treeitem"`, `role="group"`, `aria-level`, and `aria-expanded`) while
recording that production screen-reader validation remains outstanding.

Exercise these interactions:

- Pointer reorder within siblings.
- Pointer drop into an empty child container.
- Pointer move back to the root container.
- Keyboard up/down, indent, and outdent through buttons or explicit commands
  that all call the same pure model projection and `tryCommit` path.
- Rejected attempt to move a parent into its descendant.

Do not modify the DnD core if nested targeting is ambiguous. Instead, preserve
the smallest reproducible case in the spike and record the missing engine/API
signal in the evaluation report.

**Verify**:

```bash
pnpm --filter @kamod-dnd/spike-tree typecheck
pnpm --filter @kamod-dnd/spike-tree build
```

Expected: both exit 0, and no import path in the spike contains
`packages/core/src` or `../../packages/core`.

### Step 4: Add focused browser evidence

Create `spikes/tree-spike/e2e/tree.spec.ts`. Prefer keyboard/button operations
for deterministic state assertions; include one real pointer operation to
validate nested drop-target behavior rather than only testing the application
model.

Required browser cases:

1. Indent a sibling under the previous sibling and assert its rendered parent.
2. Outdent it and assert it returns immediately after the former parent.
3. Move a node into an initially empty child list.
4. Attempt a cycle and assert both the tree and rejection indicator remain
   correct.
5. Perform one pointer drag over a nested child drop zone and assert which
   container the current public engine selects.
6. Assert tree roles and `aria-level`/`aria-expanded` values for the fixture.

Run Chromium only for this decision spike. Cross-browser, touch, and actual
screen-reader matrices belong to the later production plan.

**Verify**:

```bash
pnpm --filter @kamod-dnd/spike-tree test:e2e
```

Expected: all six cases pass. If pointer targeting cannot satisfy the intended
move, encode the observed limitation as a deterministic test (without a false
support claim) and document it in Step 5.

### Step 5: Write an evidence-based tree evaluation and API recommendation

Create `docs/tree-evaluation.md`, following the concise evidence style of
`docs/engine-evaluation.md`. It must stand alone and include:

- Date, exact commands run, and pass/fail counts.
- Scope statement: this is a spike; trees remain unsupported by the package.
- Matrix of required capabilities: sibling reorder, reparent, empty parent,
  root transfer, subtree preservation, cycle prevention, nested target
  precedence, keyboard indent/outdent, semantic ARIA markup, auto-expand,
  touch, and screen-reader verification.
- For each capability, classify it as supported by the existing public API,
  supplied by application adapter logic, blocked by a missing API signal, or
  not evaluated.
- Whether unchanged `MoveIntent` is sufficient as the low-level mutation
  contract. Distinguish data representation from interaction semantics.
- Exact production seams that would need extension, naming files/symbols but
  not editing them. Likely candidates to evaluate are engine target metadata,
  horizontal pointer/depth projection, tree-specific keyboard actions,
  localized announcements, and cycle-aware validation.
- A recommendation choosing exactly one outcome:
  1. **GO** — implement a dedicated `@kamod-ch/dnd/tree` subpath on top of the
     unchanged core intent;
  2. **GO WITH CORE EXTENSION** — preserve list behavior but add narrowly scoped
     engine/session information before the tree adapter;
  3. **NO-GO** — defer trees because the required changes would destabilize the
     MVP contract.
- Proposed production API sketch, explicitly marked non-public and subject to
  a follow-up plan. Prefer a dedicated tree subpath rather than adding
  tree-only options to `useSortable`.
- Follow-up test matrix and manual accessibility/touch work required before any
  public support claim.

Do not choose GO merely because the pure model works; nested pointer behavior
and keyboard/a11y feasibility must be addressed honestly.

**Verify**:

```bash
rg -n "Trees remain unsupported|GO|NO-GO|MoveIntent|cycle|screen reader|touch" docs/tree-evaluation.md
```

Expected: matches demonstrate an explicit scope disclaimer, decision,
contract conclusion, safety discussion, and deferred manual verification.

### Step 6: Run final scoped verification and inspect the diff

Run all spike gates and workspace-safe gates. Do not fix unrelated formatting
failures.

**Verify**:

```bash
pnpm --filter @kamod-dnd/spike-tree test
pnpm --filter @kamod-dnd/spike-tree typecheck
pnpm --filter @kamod-dnd/spike-tree build
pnpm --filter @kamod-dnd/spike-tree test:e2e
pnpm typecheck
pnpm lint
pnpm exec oxfmt --check spikes/tree-spike docs/tree-evaluation.md plans/001-validate-tree-support.md plans/README.md
git diff --check -- spikes/tree-spike docs/tree-evaluation.md pnpm-lock.yaml plans
rg -n "packages/core/src|\.\./\.\./packages/core" spikes/tree-spike && exit 1 || true
git status --short
```

Expected:

- Every test/typecheck/build/lint/scoped-format command exits 0.
- `git diff --check` reports no whitespace errors.
- The forbidden internal-import search finds no matches.
- Only the in-scope paths are newly modified by this plan. Pre-existing
  modifications shown before work remain byte-for-byte preserved except for
  the intentional new lockfile importer/resolutions.

## Test plan

- Pure tests in `spikes/tree-spike/src/model.test.ts`:
  - sibling reorder;
  - root-to-child and child-to-root transfer;
  - transfer to an empty child list;
  - parent move preserves descendants;
  - self/descendant cycle rejection;
  - unknown and mismatched source rejection;
  - target index after source removal;
  - input immutability;
  - valid and boundary-invalid indent/outdent.
- Browser tests in `spikes/tree-spike/e2e/tree.spec.ts`:
  - deterministic indent/outdent and empty-child moves;
  - cycle rejection through the rendered adapter;
  - one pointer nested-target case;
  - baseline ARIA tree semantics.
- Structural patterns:
  - model tests follow `packages/core/tests/move-helpers.test.ts`;
  - browser assertions follow `tests/e2e/kanban.spec.ts`;
  - project setup follows `spikes/pragmatic-spike`.
- Verification: the Step 6 command sequence must pass in full.

## Done criteria

- [ ] The spike consumes only public `@kamod-ch/dnd` exports.
- [ ] Pure tests prove reordering, reparenting, root transfer, subtree
      preservation, cycle rejection, immutability, and keyboard projection.
- [ ] The recursive Preact fixture contains at least three hierarchy levels and
      an empty child container.
- [ ] Isolated Chromium tests record actual nested pointer-target behavior and
      deterministic keyboard behavior.
- [ ] `docs/tree-evaluation.md` contains one explicit GO / GO WITH CORE
      EXTENSION / NO-GO recommendation with evidence.
- [ ] The report clearly says trees remain unsupported by the published package.
- [ ] No `packages/core/src/**`, existing examples, root README, package exports,
      or existing E2E files were modified.
- [ ] All Step 6 commands meet their expected results.
- [ ] Existing uncommitted lockfile changes are preserved; the plan adds only
      the new spike importer/dependency changes.
- [ ] `plans/README.md` status row is updated.

## STOP conditions

Stop and report back; do not improvise if:

- Any in-scope path already exists or changed after this plan was authored.
- The pre-existing `pnpm-lock.yaml` diff cannot be separated safely from the
  spike importer changes.
- The spike cannot consume the workspace package through public exports and
  appears to require importing `packages/core/src/**`.
- A useful prototype appears to require modifying `packages/core/src/**`, the
  root README, or package exports. Record the needed seam in the report instead.
- The current `MoveIntent` cannot unambiguously represent parent-to-parent
  reparenting with target-index-after-removal semantics. Document the
  counterexample and choose NO-GO or GO WITH CORE EXTENSION; do not redesign the
  public contract inside the spike.
- Nested target behavior differs by browser or cannot be asserted
  deterministically. Preserve the reproducer and report the uncertainty.
- A verification command fails twice after one reasonable correction attempt.
- New dependencies beyond the listed existing workspace toolchain seem
  necessary.

## Maintenance notes

- This plan deliberately produces evidence and an API recommendation, not a
  production tree feature. A separate follow-up plan must implement the chosen
  API under `packages/core`, add package exports, docs, examples, multi-browser
  E2E, and release notes.
- Reviewers should scrutinize cycle detection, source ownership validation,
  nested drop-target observations, and any claim that `MoveIntent` is sufficient.
- A normalized adjacency model is only one consumer representation. Production
  helpers should avoid forcing consumers to adopt it unless the spike proves a
  generic contract.
- If a future tree adapter uses flattened visible rows and horizontal pointer
  projection instead of recursive containers, revisit collision targeting and
  depth calculation; do not infer that this spike validated that architecture.
- Manual VoiceOver/NVDA and iOS/Android testing remains mandatory before public
  tree support, consistent with `docs/a11y-manual-checklist.md`.
