# kamod-dnd — agent notes

## Layout

- **`packages/core`** — publishable `@kamod-ch/dnd` (`src/` is the library; `tests/` is Vitest).
- **`examples/*`** — Vite demos referenced by Playwright (`tests/e2e`).
- **`spikes/*`** — experiments; not the shipped API unless merged into `packages/core`.
- **`packages/docs`** — PreactPress site.

## Verification

```bash
pnpm check              # typecheck, format, lint, test, build, docs:check
pnpm test:browser       # Playwright (editor, kanban, tree); not part of `pnpm check`
pnpm check:release      # full release gate including browser and tarball QA
```

Package-only tests: `pnpm --filter @kamod-ch/dnd test`.

## Conventions

- Session contract and behaviour: [README.md](README.md) and [CHANGELOG.md](CHANGELOG.md).
- Evaluation docs under `docs/*-evaluation.md` may describe spikes; prefer CHANGELOG for what is actually exported.
- Do not treat spike-local helpers as the library unless they are imported from `@kamod-ch/dnd`.
