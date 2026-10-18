# Plan 003: First public release of `@kamod-ch/dnd` including `./tree`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat HEAD -- packages/core/package.json packages/core/src/tree CHANGELOG.md`
> Confirm Plan 002 is **DONE** in `plans/README.md` and that `packages/core/package.json`
> exports `"./tree"`. On mismatch, stop.

## Status

- **Priority**: P2
- **Effort**: S (release hygiene + publish gate; no new DnD behavior)
- **Risk**: MED (public npm artifact; version is permanent)
- **Depends on**: Plan 002 (DONE)
- **Category**: release
- **Planned at**: 2026-10-19

## Why this matters

`@kamod-ch/dnd@0.1.0` is recorded in `CHANGELOG.md` as a **local, unpublished**
list MVP. Plan 002 added `@kamod-ch/dnd/tree` and nested drop-target selection
but **explicitly excluded npm publish**. Shipping that work requires a version,
changelog, and a pack that resolves `./tree` — without pulling in features Plan
002 left out.

## Current state

- Package version: `0.1.0` in [`packages/core/package.json`](../packages/core/package.json).
- Changelog: [`CHANGELOG.md`](../CHANGELOG.md) — `0.1.0 – 2026-10-18 (lokal, nicht veröffentlicht)`.
- Exports: `"."`, `"./sortable"`, `"./tree"` (`dist/tree.js`).
- Local beta checklist: [`docs/beta-release-checklist.md`](../docs/beta-release-checklist.md) — automated gates checked; **manual a11y/touch still open**; publish forbidden without a separate order.
- Tarball smoke already imports `@kamod-ch/dnd/tree` (`scripts/qa-tarball-consumer.mjs`).

**Still out of scope** (do not implement in this plan): auto-expand on hover,
virtualization, grids, flattened-row pointer projection, touch/SR certification.

## Commands you will need

| Purpose         | Command                                        | Expected on success                   |
| --------------- | ---------------------------------------------- | ------------------------------------- |
| Full local gate | `pnpm check`                                   | exit 0                                |
| List browsers   | `pnpm test:browser`                            | 24 passed                             |
| Tree browsers   | `pnpm --filter @kamod-dnd/spike-tree test:e2e` | 5 passed                              |
| Pack smoke      | `node scripts/qa-tarball-consumer.mjs`         | exit 0; `./tree` resolves             |
| Registry probe  | `npm view @kamod-ch/dnd version`               | version string, or 404 if unpublished |

## Scope

**In scope:**

- Bump `packages/core/package.json` **version to `0.2.0`**.
  - Keep the existing `0.1.0` changelog heading as the unpublished list MVP.
  - Add a `0.2.0` section: first publish candidate, `./tree` subpath, `pickActiveDropTarget`, docs/spike pointer reparent, limitations (touch/SR not certified; no auto-expand / virtualization / grids / flattened rows).
- Refresh [`docs/beta-release-checklist.md`](../docs/beta-release-checklist.md) dates and re-check automated boxes after the gates below. Leave the manual a11y box **unchecked**.
- One-line note in [`docs/development/roadmap-progress.md`](../docs/development/roadmap-progress.md) that `./tree` exists and publish is Plan 003 (do not rewrite the whole roadmap).
- **Publish step** only when the operator message that starts execution explicitly says to publish (for example “execute Plan 003 and npm publish”). Then:
  1. `pnpm --filter @kamod-ch/dnd build`
  2. `pnpm --filter @kamod-ch/dnd publish --access public --no-git-checks`
  3. `npm view @kamod-ch/dnd version` equals `0.2.0`
  4. Changelog line no longer says the published version is unpublished.

**Out of scope:**

- Auto-expand, virtualization, grids, flattened-row trees.
- Git push, tags, or GitHub releases unless the same operator message asks for them.
- Changing `MoveIntent`, `useSortable`, or drop-target rules.
- Claiming VoiceOver, NVDA, or touch certification.

## Git workflow

- Branch: `feature/003-release-dnd-0.2.0`
- One commit for version + changelog + checklist notes is enough.
- Do not push unless instructed.

## Steps

### Step 1: Confirm 002 and registry

1. Plan 002 status is **DONE**.
2. `npm view @kamod-ch/dnd version`.
   - **404 / not found**: continue; `0.2.0` will be the first publish.
   - **Any published version ≥ 0.2.0**: STOP and report; do not overwrite.
   - **Published `0.1.0` only**: continue with `0.2.0`.

### Step 2: Version and notes

1. Set `"version": "0.2.0"` in `packages/core/package.json`.
2. Prepend `## 0.2.0` to `CHANGELOG.md` (keep `0.1.0` as local/unpublished history).
3. Update the beta checklist stand date after re-running gates. Manual a11y stays open.
4. Short roadmap note for the tree subpath.

**Verify:** `pnpm --filter @kamod-ch/dnd build` and confirm `dist/tree.js` exists.

### Step 3: Release gates

```bash
pnpm check
pnpm test:browser
pnpm --filter @kamod-dnd/spike-tree test:e2e
node scripts/qa-tarball-consumer.mjs
```

Expected: all exit 0. Tree E2E includes pointer reparent (`c2` parent `c1`).

### Step 4: Publish (conditional)

If the execution request did **not** explicitly authorize `npm publish`, stop after Step 3 with version and changelog ready locally. Mark the plan **BLOCKED** with reason “awaiting explicit publish authorization” rather than **DONE**.

If publish was authorized and Step 3 passed, publish as in Scope, then set this plan to **DONE**.

## Done criteria

- [x] `packages/core` version is `0.2.0`.
- [x] `CHANGELOG.md` has a `0.2.0` section covering `./tree` and the drop-target fix, with touch/SR and excluded tree features called out.
- [x] `pnpm check`, `pnpm test:browser`, spike tree E2E, and tarball smoke passed on this version.
- [x] Manual a11y checklist item remains open.
- [x] Plan **BLOCKED** pending explicit publish order (registry has no `@kamod-ch/dnd` yet; `npm publish` not authorized in execution message).
- [ ] npm shows `@kamod-ch/dnd@0.2.0` (unblocks DONE).

## STOP conditions

Stop and report; do not improvise if:

- Plan 002 is not DONE or `"./tree"` is missing from package exports.
- `npm view` shows a version greater than or equal to `0.2.0` already.
- Any release gate fails.
- Publish was not explicitly requested in the execution message — do not publish.
- Completing the release seems to require new tree behavior (auto-expand, virtualization, grids, flattened rows) — that is a later plan.

## Maintenance notes

- Flattened-row pointer projection, auto-expand, virtualization, and grids stay future plans.
- After publish, a git tag `v0.2.0` is optional and needs its own instruction.
