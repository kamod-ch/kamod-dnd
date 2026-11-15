# Implementation Status

Stand: siehe [CHANGELOG.md](../CHANGELOG.md) (aktuell **0.4.1** auf npm). Der frühere 0.3.0-Stand in dieser Datei ist durch Releases 0.3–0.4 ersetzt.

## Schnellcheck

```bash
pnpm check
pnpm test:browser    # optional; in CI unter `.github/workflows/ci.yml`
```

## Verifikation

| Bereich                  | Nachweis                                                             |
| ------------------------ | -------------------------------------------------------------------- |
| Unit / Integration       | `packages/core/tests` (Vitest); `pnpm --filter @kamod-ch/dnd test`   |
| Browser                  | `tests/e2e` (editor, kanban, tree)                                   |
| Paket-QA                 | `pnpm qa:tarball`, `pnpm docs:build`                                 |
| Performance (informativ) | `node scripts/benchmark-drag.mjs` → `docs/performance/drag-lists.md` |

## Offene Grenzen (unverändert)

- Manuelle Screenreader- und Touch-Zertifizierung: [a11y-manual-checklist.md](a11y-manual-checklist.md).
- `@kamod-ch/dnd/tree` bleibt **experimental** bis die Checkliste signiert ist: [tree-ga.md](tree-ga.md).
- Virtuelle Listen: Autoscroll kann noch ein gemountetes Source-Node erfordern — [README.md](../README.md), [virtualization-evaluation.md](virtualization-evaluation.md).

Details zum Ursprungsplan (01–08) stehen in [development/roadmap-progress.md](development/roadmap-progress.md) (historisch).
