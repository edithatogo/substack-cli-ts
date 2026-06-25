# CI Hardening

This repo separates stable merge gates from experimental hardening lanes so feature work does not need to depend on private Substack endpoints or unstable dependency tags.

## Required Gates

- `CI / Quality`: Biome, Knip, typecheck, build, coverage, production audit, and secret scan.
- `CI / Smoke`: build plus `node dist/cli.js inspect examples/basic.md`.
- `Hardening / Required Audit And Secret Scan`: production dependency audit and secret-pattern scan without advisory `continue-on-error`.
- `Hardening / Node Compatibility`: build and smoke tests across the supported Node line.

## Strictness Lanes

- `Hardening / Strictest TypeScript`: runs `tsconfig.strictest.json` with stricter source compiler flags and is a required hardening check.
- `Hardening / Index Signature Strictness`: runs `tsconfig.index-signature-strict.json` as an advisory migration lane for dynamic Substack response maps.
- `Hardening / Dependency Declaration Strictness`: runs `tsconfig.dependency-strict.json` with library checking enabled as an advisory lane for upstream declaration compatibility.

## Advisory Lanes

- `CI / Mutation`: remains review-required while module-level mutation thresholds continue to mature.
- `Hardening / Experimental Dependency Lane`: scheduled or manually dispatched only. It installs one prerelease lane with `--no-save` and keeps normal PRs on stable dependency releases. Current lanes are `playwright-next`, `stagehand-alpha`, `typescript-rc`, `typescript-next`, `vitest-beta`, `zod-canary`, and `prettier-alpha`.

Run an experimental lane locally with:

```sh
npm run experimental:deps -- playwright-next
```

Refresh stable and experimental dependency candidates with:

```sh
npm outdated --json
npm view package-name version dist-tags --json
```

Use `npm outdated --json` for the installed stable baseline, then query each targeted package with `npm view package-name version dist-tags --json` to capture the exact stable, next, beta, alpha, rc, or canary tag before editing `package.json` or an experimental lane.

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

`coverage release-scorecard` reports local readiness separately from npm, GitHub release, MCP registry, marketplace, and Substack admin owner gates. Treat `localStatus: "ready"` plus `releaseVerdict: "ready-for-owner-launch"` as the handoff point for owner-approved release work; `externalStatus: "owner-gated"` still means account/admin follow-through remains outside autonomous automation.

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

Keep index-signature strictness, dependency declaration strictness, E2E, and experimental dependency checks advisory until their false-positive, upstream declaration, and fixture requirements are resolved. Treat mutation as review-required and CI-visible; raise module thresholds gradually rather than using one global jump.
