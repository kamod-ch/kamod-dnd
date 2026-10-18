# Engine-Evaluation (Phase 0)

Stand: 2026-10-18. Geprüft in diesem Repository unter `spikes/`.

## Kandidaten

| Engine                                                    | Version (npm)         | Lizenz     | Runtime-Deps (Kern)                               |
| --------------------------------------------------------- | --------------------- | ---------- | ------------------------------------------------- |
| @dnd-kit/core + @dnd-kit/sortable                         | 6.3.1 / 10.0.0        | MIT        | tslib, @dnd-kit/accessibility, @dnd-kit/utilities |
| @atlaskit/pragmatic-drag-and-drop (+ hitbox, auto-scroll) | 4.0.0 / 3.0.0 / 2.1.5 | Apache-2.0 | Keine React-Pflicht im Core                       |

Quellen: https://dndkit.com/, https://atlassian.design/components/pragmatic-drag-and-drop/, npm registry (zum Implementierungszeitpunkt).

## Spikes

- `spikes/pragmatic-spike`: zwei Listen, variable Höhen, leere Zieliste, Handle-only, Input + contenteditable, Scrollcontainer, Escape-Listener, Preact 10 ohne compat.
- `spikes/dnd-kit-spike`: eine Liste mit @dnd-kit/sortable-Hooks auf Preact (ohne @dnd-kit/react).

Build-Nachweis: `pnpm --filter './spikes/*' build` (beide grün am 2026-10-18).

## Muss-Kriterien (Kurzstatus)

| Kriterium                     | Pragmatic                                                               | dnd-kit (core spike)                                |
| ----------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| Preact ohne React/compat      | bestanden (Vite-Produktionsbuild)                                       | bestanden (minimaler Spike)                         |
| Touch & Scrollen              | Codepfad vorhanden (touch-action am Handle); **echtes Gerät ungeprüft** | Spike nicht abgedeckt                               |
| Tastatur / A11y               | Engine-Hilfen + Library-Schicht; Screenreader **manuell offen**         | KeyboardSensor im Spike, keine vollständige A11y    |
| Editor-Verträglichkeit        | dragHandle getrennt; Spike mit input/CE                                 | Handle-Aktivator im Spike                           |
| Variable Höhen & leere Listen | Spike                                                                   | nur eine Liste im Spike                             |
| SSR & Cleanup                 | Import ohne DOM in Vitest; combine()-Cleanups                           | nicht geprüft                                       |
| Wartbarkeit                   | dokumentierte Adapter-API                                               | React-Ökosystem (@dnd-kit/react) für volle Features |

## Bundle (Spike-Build, gzip aus Vite)

| Spike           | JS (gzip) |
| --------------- | --------- |
| pragmatic-spike | ~17.5 KB  |
| dnd-kit-spike   | ~25.9 KB  |

Messmethode: `vite build` Ausgabe; kein Vergleich mit finalem @kamod-ch/dnd-Consumer.

## Empfehlung

**@atlaskit/pragmatic-drag-and-drop** als Produktions-Engine: frameworkneutral, Handle-/Container-Adapter passen zum headless Preact-Ziel, Multi-Listen-Spike deckt MVP-Szenarien ab. dnd-kit bleibt als Spike-Referenz; @dnd-kit/react wird bewusst nicht eingeführt (React-Pflicht).
