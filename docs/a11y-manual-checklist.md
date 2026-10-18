# Manuelle Accessibility- und Touch-Checkliste

Nicht in CI ausgeführt (2026-10-18).

## Screenreader

- [ ] VoiceOver + Safari: Handle fokussieren, Aufnahme, Pfeil-/Menü-Aktion, Drop, Escape, Fokus nach Drop.
- [ ] NVDA + Firefox: gleiche Schritte auf Kanban-Beispiel.

## Touch

- [ ] iOS Safari: Drag am Handle, Scrollen im Board, kein versehentlicher Drag beim Scrollen.
- [ ] Android Chrome: Pointer-Cancel, Klick nach Drag.

## Reduced motion

- [ ] `prefers-reduced-motion: reduce` – keine unnötigen Animationen in Beispielen (Theme/Library respektiert `reducedMotion` auf Provider).
