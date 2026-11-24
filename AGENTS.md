# Agent rules

- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before calling a change done; CI runs the same plus the benchmark.
- Write commits as Conventional Commits with a scope, e.g. `feat(api): …`, `fix(ui): …`.

## Open questions

- Boundaries: which actions need approval first (deploys, pushes, production Redis data, upgrades)?
- Git workflow: commit straight to `main`, or branch and open pull requests?
- Autonomy: when to decide alone and when to stop and ask?
