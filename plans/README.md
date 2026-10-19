# Implementation Plans

Generated and reconciled by the improve skill on 2026-10-19. Each Cursor
executor must read its plan fully, run the drift check first, honor STOP
conditions, and update only its own status row when complete.

## Execution order and status

| Plan | Title                                                        | Priority | Effort   | Depends on   | Status                                                                               |
| ---- | ------------------------------------------------------------ | -------- | -------- | ------------ | ------------------------------------------------------------------------------------ |
| 001  | Validate tree support and define a production-ready tree API | P2       | M        | —            | DONE                                                                                 |
| 002  | Ship `@kamod-ch/dnd/tree` with nested-target engine fix      | P2       | L        | 001          | DONE                                                                                 |
| 004  | Establish a green verification baseline and CI release gates | P1       | M        | —            | DONE                                                                                 |
| 005  | Keep `DndProvider` callbacks current across rerenders        | P1       | M        | 004          | DONE                                                                                 |
| 006  | Reject drops without a live target and cancel removed ones   | P1       | M        | 004          | DONE                                                                                 |
| 007  | Announce pointer and keyboard drag lifecycle accurately      | P1       | M        | 005, 006     | DONE                                                                                 |
| 008  | Keep the tree entry framework-free                           | P2       | S        | 004          | DONE                                                                                 |
| 009  | Isolate drag sessions between provider instances             | P1       | M        | 008          | DONE                                                                                 |
| 010  | Reconcile controlled data and suppress no-op commits         | P1       | M        | 008, 009     | DONE                                                                                 |
| 003  | First public release of `@kamod-ch/dnd` including `./tree`   | P2       | S        | 002, 004–010 | BLOCKED (awaiting fixes and publish authorization)                                   |
| 011  | Restore focus, labels, and complete device accessibility     | P1       | M+manual | 008–010      | BLOCKED (VoiceOver/Safari, NVDA/Firefox, iOS Safari, Android Chrome, reduced motion) |
| 012  | Graduate tree support to production/full matrix              | P2       | L        | 008–011      | BLOCKED (VoiceOver/NVDA/iOS/Android tree certification unavailable)                  |
| 013  | Evaluate a virtualization contract                           | P3       | M        | 008–011      | DONE (GO WITH EXTENSION; core unchanged)                                             |
| 014  | Evaluate horizontal, RTL, and grid strategies                | P3       | M–L      | 008–011      | DONE (horizontal-only extension; grids separate; core unchanged)                    |
| 015  | Evaluate multi-select move semantics                         | P3       | M        | 008–011      | DONE (GO WITH EXTENSION; MoveIntent unchanged; core unchanged)                      |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) |
REJECTED (with one-line rationale)

## Release tiers

### Beta/public package gate

Execute `008 → 009 → 010 → 003`. Plan 003 still requires explicit operator
authorization for `npm publish`; no plan may infer that authorization.

### Stable accessibility / 1.0 gate

Plan 011 is required before a stable accessibility claim. Automated checks do
not complete its manual VoiceOver, NVDA, iOS, or Android requirements. If the
hardware is unavailable, status must remain `BLOCKED` with the missing matrix.

### Stable tree gate

Plan 012 is required only if `@kamod-ch/dnd/tree` will be marketed as stable.
Until then, keep tree support opt-in/experimental and preserve the documented
limitations.

### Optional capability research

Plans 013–015 are independent decision spikes after Plan 011 and may run in
parallel. A positive spike outcome requires a separate production implementation
plan; the spike itself must not modify public package source.

## Dependency notes

- Plan 008 should finish before 009/010 because it currently moves the sortable
  state helper used by later consistency work.
- Plan 009 precedes 010 so external-data tests can rely on provider-scoped IDs
  and event isolation.
- Plan 011 builds on provider isolation and controlled-data cancellation to
  restore focus reliably after every terminal path.
- Plan 012 uses the focus/label contract from 011 and promotes the tree spike
  only after a full browser and manual matrix.
- Plans 013–015 deliberately stay isolated under `spikes/`; do not fold their
  experimental APIs into core during evaluation.

## Findings considered and rejected

- Implement trees directly without a spike: rejected by Plan 001; Plan 002
  implemented the evidence-based core extension.
- Treat cross-container transfer as complete tree support: rejected because
  hierarchy, cycles, keyboard projection, focus, and accessibility need
  explicit semantics.
- Flag the docs theme's `dangerouslySetInnerHTML` as injection: rejected because
  it renders trusted build-time PreactPress markdown, not request/user input.
- Treat script `console.log` calls as production logging debt: rejected because
  they are intentional CLI output.
- Add a general plugin engine: rejected; the ADR intentionally supports one
  engine and none of the selected capabilities requires a plugin architecture.
- Add file upload or cross-window drag to this roadmap: rejected because those
  require a materially different native-data/security contract and are not
  adjacent to sortable application data.
- Upgrade all dependencies inside feature plans: rejected as unsafe bundling of
  migration and behavior changes. Handle auto-scroll, Vite, and compatibility
  upgrades in isolated follow-up plans.
