# Lokale Beta-Release-Checkliste

Stand: 2026-11-15 (Target-Patch **0.4.2**; npm publish nur auf Auftrag).

- [x] `pnpm check` grün
- [x] `pnpm check:release` grün (inkl. `docs:build`, `qa:tarball`)
- [x] `pnpm test:browser` grün (Chromium, Firefox, WebKit – **66** E2E-Tests)
- [x] `pnpm test:tree-browser` grün (Tree-Spike E2E)
- [x] `node scripts/qa-tarball-consumer.mjs` grün
- [x] `npm pack` / `pnpm pack` ohne `examples/`, `spikes/`, `tests/`
- [x] LICENSE im Paket; Apache-2.0 Hinweis für Pragmatic DnD in README
- [ ] Manuelle A11y/Touch-Liste ([docs/a11y-manual-checklist.md](a11y-manual-checklist.md)) – **offen** (kein Gerät/SR in CI; blockiert Tree **0.5.0**, nicht 0.4.2)
- [x] Kein `npm publish` / kein `git push` ohne separaten Auftrag

Zusätzlich (Beta-Härtung):

- [x] `node scripts/benchmark-drag.mjs` → [docs/performance/drag-lists.md](performance/drag-lists.md)
- [x] `node scripts/bundle-size-report.mjs` → [docs/performance/bundle-size.md](performance/bundle-size.md)
