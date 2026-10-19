# Manuelle Accessibility- und Touch-Checkliste

Nicht in CI ausgeführt (2026-10-18).

Automatisierte DOM-Tests am 2026-10-19 prüfen Fokus nach Move/Cancel, menschliche Labels und das Tree-Beispiel in Chromium, Firefox und WebKit. Sie schließen keinen der folgenden Punkte ab. Offen bleiben VoiceOver + Safari, NVDA + Firefox, iOS Safari, Android Chrome und `prefers-reduced-motion` auf einem echten Gerät. Für den Baum zusätzlich: Fokusreihenfolge, `aria-level`/`aria-expanded`, Reparent-Ansage, Scrollen und Zyklus-Ablehnung.

## Screenreader

- [ ] VoiceOver + Safari: Handle fokussieren, Aufnahme, Pfeil-/Menü-Aktion, Drop, Escape, Fokus nach Drop.
- [ ] NVDA + Firefox: gleiche Schritte auf Kanban-Beispiel.

## Touch

- [ ] iOS Safari: Drag am Handle, Scrollen im Board, kein versehentlicher Drag beim Scrollen.
- [ ] Android Chrome: Pointer-Cancel, Klick nach Drag.

## Reduced motion

- [ ] `prefers-reduced-motion: reduce` – keine unnötigen Animationen in Beispielen (Theme/Library respektiert `reducedMotion` auf Provider).
