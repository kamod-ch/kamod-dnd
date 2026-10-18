# ADR 001: Drag-and-Drop-Engine

## Status

Angenommen (2026-10-18).

## Kontext

@kamod-ch/dnd soll headless auf Preact 10+ ohne preact/compat laufen. Zwei Kandidaten wurden als Spikes verifiziert (siehe `docs/engine-evaluation.md`).

## Entscheidung

Produktcode verwendet **@atlaskit/pragmatic-drag-and-drop** mit optionalen Paketen `@atlaskit/pragmatic-drag-and-drop-hitbox` und `@atlaskit/pragmatic-drag-and-drop-auto-scroll`.

Interner Adapter: `packages/core/src/engine/pragmatic/`.

## Alternativen

- **@dnd-kit/core**: funktioniert in einem minimalen Preact-Spike, aber Sortable/Context-Story ist auf @dnd-kit/react ausgerichtet; höheres Integrationsrisiko ohne compat.
- **Eigene Engine**: abgelehnt für MVP (Planvorgabe).

## Konsequenzen

- Apache-2.0-Lizenztext in README und Paketmetadaten beachten.
- Spike-Abhängigkeiten bleiben in `spikes/*`, nicht im publizierten Paket-Manifest als Vergleichs-Engines.
- Manuelle Touch- und Screenreader-Prüfungen bleiben als Release-Gate dokumentiert.
