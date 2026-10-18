# Lokale Beta-Release-Checkliste

Stand: 2026-10-19 (Plan 003 Gates; Version `0.2.0` lokal, npm publish ausstehend).

- [x] `pnpm check` grün
- [x] `pnpm test:browser` grün (Chromium, Firefox, WebKit – 24 Tests)
- [x] `node scripts/qa-tarball-consumer.mjs` grün
- [x] `npm pack` / `pnpm pack` ohne `examples/`, `spikes/`, `tests/`
- [x] LICENSE im Paket; Apache-2.0 Hinweis für Pragmatic DnD in README
- [ ] Manuelle A11y/Touch-Liste ([docs/a11y-manual-checklist.md](a11y-manual-checklist.md)) – **offen** (kein Gerät/SR in CI)
- [x] Kein `npm publish` / kein `git push` ohne separaten Auftrag

Zusätzlich (Beta-Härtung):

- [x] `node scripts/benchmark-drag.mjs` → [docs/performance/drag-lists.md](performance/drag-lists.md)
- [x] `node scripts/bundle-size-report.mjs` → [docs/performance/bundle-size.md](performance/bundle-size.md)
