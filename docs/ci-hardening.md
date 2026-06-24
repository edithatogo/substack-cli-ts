# CI Hardening

This repo separates stable merge gates from experimental hardening lanes so feature work does not need to depend on private Substack endpoints or unstable dependency tags.

## Required Gates

- `CI / Quality`: Biome, Knip, typecheck, build, coverage, production audit, and secret scan.
- `CI / Smoke`: build plus `node dist/cli.js inspect examples/basic.md`.
- `Hardening / Required Audit And Secret Scan`: production dependency audit and secret-pattern scan without advisory `continue-on-error`.
- `Hardening / Node Compatibility`: build and smoke tests across the supported Node line.

## Advisory Lanes

- `Hardening / Strictest TypeScript`: runs `tsconfig.strictest.json` with stricter compiler flags. It is advisory until source modules pass consistently.
- `CI / Mutation`: remains advisory until module-level mutation thresholds are stable.
- `Hardening / Experimental Dependency Lane`: scheduled or manually dispatched only. It may inspect canary or next-tag compatibility, but normal PRs must stay on stable dependency releases.

## Release Evidence

Run these locally before an external release or registry submission:

```sh
npm run build
npm test
npm run test:coverage
npm run frontier:drift
npm run audit:prod
npm run scan:secrets
npm run sbom
node dist/cli.js coverage release-scorecard
```

`coverage release-scorecard` reports local readiness separately from npm, GitHub release, MCP registry, marketplace, and Substack admin owner gates.

## Branch Protection Recommendation

Require these checks for feature and dependency PRs after the generated API contract lane is green:

- `Quality`
- `Smoke`
- `Required Audit And Secret Scan`
- `Node Compatibility (20)`
- `Node Compatibility (22)`
- `Node Compatibility (24)`
- generated contract check
- frontier drift check

Keep strictest TypeScript, mutation, E2E, and experimental dependency checks advisory until their false-positive and fixture requirements are resolved.
