# Implementation Plans

Generated and reconciled by the improve skill on 2026-10-19. Execute in the
order below unless dependencies say otherwise. Each executor must read the plan
fully before starting, honor its STOP conditions, and update the status row when
done.

## Execution order and status

| Plan | Title                                                        | Priority | Effort | Depends on   | Status                                             |
| ---- | ------------------------------------------------------------ | -------- | ------ | ------------ | -------------------------------------------------- |
| 001  | Validate tree support and define a production-ready tree API | P2       | M      | —            | DONE                                               |
| 002  | Ship `@kamod-ch/dnd/tree` with nested-target engine fix      | P2       | L      | 001          | DONE                                               |
| 004  | Establish a green verification baseline and CI release gates | P1       | M      | —            | DONE                                               |
| 005  | Keep `DndProvider` callbacks current across rerenders        | P1       | M      | 004          | DONE                                               |
| 006  | Reject drops without a live target and cancel removed ones   | P1       | M      | 004          | TODO                                               |
| 007  | Announce pointer and keyboard drag lifecycle accurately      | P1       | M      | 005, 006     | TODO                                               |
| 008  | Keep the tree entry framework-free                           | P2       | S      | 004          | TODO                                               |
| 003  | First public release of `@kamod-ch/dnd` including `./tree`   | P2       | S      | 002, 004–008 | BLOCKED (awaiting fixes and publish authorization) |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) |
REJECTED (with one-line rationale — finding fixed independently or approach
abandoned)

## Dependency notes

- Plan 001 was the decision spike; Plan 002 implemented its **GO WITH CORE
  EXTENSION** outcome. Both are complete.
- Plan 004 is the verification baseline and must land before new behavioral
  changes. It also gives later executors one reliable local and CI gate.
- Plans 005 and 006 are independent after Plan 004 and may run in parallel.
- Plan 007 depends on Plans 005 and 006 because announcements need both a stable
  provider lifecycle and accurate cancellation/drop transitions.
- Plan 008 is independent of Plans 005–007 after the baseline, but should land
  before publication so the first public tree artifact has the intended pure
  dependency graph.
- Plan 003 remains the release plan, but publication must wait for Plans
  004–008 and a fresh release-gate run. Explicit operator authorization is
  still required for `npm publish`.

## Findings considered and rejected

- Implement trees directly in the MVP package without a spike: rejected by Plan
  001; the completed spike identified and Plan 002 fixed nested-target behavior.
- Treat cross-container transfer as complete tree support: rejected because
  hierarchy, cycle protection, keyboard projection, and accessibility need
  explicit adapter semantics.
- Flag the docs theme's `dangerouslySetInnerHTML` as an injection issue:
  rejected because it renders trusted build-time PreactPress markdown, not
  request or user input.
- Treat script `console.log` calls as production logging debt: rejected because
  they are intentional CLI output from QA/report scripts.
- Add a tree-state validator for arbitrary cyclic input in this wave: deferred;
  current public helpers assume a valid application-owned tree, and lifecycle,
  CI, and accessibility defects have higher leverage. Revisit with a separate
  API-contract plan if consumers need untrusted-state ingestion.
- Upgrade all outdated dependencies in the same change: rejected as overly
  broad. Auto-scroll, Vite, and Preact compatibility should be migrated in
  isolated follow-up plans after the correctness work.
