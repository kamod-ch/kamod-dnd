# kamod-dnd – Roadmap-Fortschritt

Stand: 2026-10-18. Quelle: `docs/development/kamod-dnd-plan-cursor-prompts.md`.

## Aufgabenübersicht

| Aufgabe                       | Status                            | Nächster Schritt                 |
| ----------------------------- | --------------------------------- | -------------------------------- |
| 01 Engine-Spike & Architektur | erledigt                          | —                                |
| 02 Paketgerüst & Vertrag      | erledigt                          | —                                |
| 03 Session & Preact-Bindings  | erledigt                          | —                                |
| 04 Sortable & Transfers       | erledigt                          | —                                |
| 05 A11y, Touch, Tastatur      | erledigt (SR/Touch manuell offen) | `docs/a11y-manual-checklist.md`  |
| 06 Editor & Kanban            | erledigt                          | —                                |
| 07 Browser-Tests & Paket-QA   | erledigt                          | 24× Playwright, Performance-Docs |
| 08 Dokumentation & Beta       | erledigt                          | Checkliste aktualisiert          |
| Beta-Härtung (Follow-up)      | erledigt                          | —                                |

---

## Aufgabe 01 – Engine-Spike und Architekturentscheidung

**Status:** erledigt

**Umgesetzte Änderungen:** `spikes/pragmatic-spike`, `spikes/dnd-kit-spike`; `docs/engine-evaluation.md`; `docs/decisions/001-engine.md`.

**Prüfungen:** `pnpm --filter './spikes/*' build` – beide grün.

**Entscheidungen:** Pragmatic DnD als Produktions-Engine (Preact ohne compat, Multi-Listen-Spike). `@kamod-ch/hooks` useDrag/useDrop bleiben HTML5-API – kein Duplikat.

---

## Aufgabe 02 – Paketgerüst und öffentlicher Vertrag

**Status:** erledigt

**Umgesetzte Änderungen:** `packages/core` als `@kamod-ch/dnd`, Exports `.` und `./sortable` (gleiches Bundle, kein doppeltes Context-Modul).

**Prüfungen:** `pnpm --filter @kamod-ch/dnd build`, SSR-Import-Test.

---

## Aufgabe 03 – Drag-Session und Preact-Bindings

**Status:** erledigt

**Umgesetzte Änderungen:** `DndController`, Signals, `DndProvider`, `useDraggable`/`useDroppable`/`useDndState`, Pragmatic-Adapter, StrictMode-sicheres Cleanup.

**Prüfungen:** Vitest (4 Tests), Editor-Beispiel lädt in Chromium.

---

## Aufgabe 04 – Sortable und kontrollierte Transfers

**Status:** erledigt

**Umgesetzte Änderungen:** `MoveIntent`, `applyMoveIntentToIds`, `useSortable`/`useSortableContainer`, Zielindex nach Quellentfernung.

**Prüfungen:** `move-helpers.test.ts`, Playwright-Reorder.

---

## Aufgabe 05 – Tastatur, Touch und Accessibility

**Status:** erledigt (automatisiert); manuelle Lücken dokumentiert

**Umgesetzte Änderungen:** Live-Region, `locale`/Messages, Keyboard-Moves, `touch-action` am Handle, `docs/a11y-manual-checklist.md`.

**Prüfungen:** Keyboard-Buttons in Beispielen; Touch/SR **ungeprüft** auf echtem Gerät.

---

## Aufgabe 06 – Editor und Kanban

**Status:** erledigt

**Umgesetzte Änderungen:** `examples/editor-blocks`, `examples/kanban` mit @kamod-ch/ui/button und @kamod-ch/themes/theme.css; kein editable.ts im Workspace – einfache contenteditable-Dummies.

**Prüfungen:** `pnpm --filter './examples/*' build`.

---

## Aufgabe 07 – Verhalten, Performance und Paketprüfung

**Status:** erledigt (mit dokumentierten Grenzen)

**Umgesetzte Änderungen:** Playwright `tests/e2e/editor-drag.spec.ts`, `scripts/qa-tarball-consumer.mjs` (Vite-Consumer), `scripts/bundle-size-report.mjs`.

**Prüfungen:** `pnpm exec playwright test --project=chromium` – 2/2 grün; Tarball-Smoke grün.

**Offene Probleme:** Performance-Szenarien 100/500 Elemente nicht automatisiert; Firefox/WebKit nicht in diesem Lauf ausgeführt.

---

## Aufgabe 08 – Dokumentation und Beta-Vorbereitung

**Status:** erledigt

**Umgesetzte Änderungen:** `README.md`, `CHANGELOG.md`, `docs/implementation-status.md`, `docs/beta-release-checklist.md`, `LICENSE`.

**Prüfungen:** `pnpm check` (siehe Abschlusslauf).

**Plan 003 (2026-10-19):** `@kamod-ch/dnd/tree` Subpath und Release `0.2.0` vorbereitet; npm publish nur nach explizitem Auftrag ([`plans/003-release-tree.md`](../../plans/003-release-tree.md)).
