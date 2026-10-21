# Implementation Status

Stand: 2026-10-21 (0.3.0 must-haves).

## Aufgaben (Ursprungsplan)

| #   | Aufgabe               | Status   | Nachweis                                 |
| --- | --------------------- | -------- | ---------------------------------------- |
| 01  | Engine-Spike & ADR    | erledigt | `docs/engine-evaluation.md`, `spikes/*`  |
| 02  | Paketgerüst & Vertrag | erledigt | `packages/core`                          |
| 03  | Session & Preact      | erledigt | Vitest + E2E                             |
| 04  | Sortable & Transfer   | erledigt | `controller.test.ts`, Kanban E2E         |
| 05  | A11y / Touch / KB     | erledigt | Keyboard E2E; SR/Touch manuell **offen** |
| 06  | Editor & Kanban       | erledigt | `examples/*` build                       |
| 07  | Browser & Paket-QA    | erledigt | 24× Playwright; Performance-Docs         |
| 08  | Doku & Beta           | erledigt | README, Checkliste, Performance          |

## Prüfkommandos (zuletzt ausgeführt)

```bash
pnpm check                                    # grün
pnpm test                                     # 77+ Vitest (packages/core)
pnpm exec playwright test                     # editor/kanban/tree e2e (chromium, firefox, webkit)
node scripts/qa-tarball-consumer.mjs          # grün
node scripts/benchmark-drag.mjs               # docs/performance/drag-lists.md
node scripts/bundle-size-report.mjs           # docs/performance/bundle-size.md
```

## Browser-Matrix

| Engine   | Ergebnis  | Anmerkung                                                     |
| -------- | --------- | ------------------------------------------------------------- |
| Chromium | bestanden | 8/8 Tests                                                     |
| Firefox  | bestanden | 8/8 Tests                                                     |
| WebKit   | bestanden | 8/8 Tests; `pnpm exec playwright install webkit` erforderlich |

Touch-Emulation ersetzt keine echten Geräte ([docs/a11y-manual-checklist.md](a11y-manual-checklist.md)).

## Anforderung → Nachweis (Auszug)

| Anforderung              | Status    | Nachweis                         |
| ------------------------ | --------- | -------------------------------- |
| Verbotener Drop          | getestet  | `controller.test.ts`, Kanban E2E |
| Cancel / Escape          | getestet  | Editor + Kanban E2E              |
| Transfer leere Liste     | getestet  | Kanban E2E                       |
| Keyboard MoveIntents     | getestet  | Editor + Kanban E2E              |
| Performance 100/500      | gemessen  | `docs/performance/drag-lists.md` |
| Pack-Inhalt headless     | geprüft   | `pnpm pack` nur `dist/`, README  |
| VoiceOver / NVDA / Touch | ungeprüft | Manuelle Checkliste              |

## Offene Grenzen

- Keine Screenreader- oder Mobilgeräte-Session in dieser Umgebung.
- Performance-Messung ist informativ (Row-Render-Zähler während Drag), keine FPS-Garantie.
