# Post-1.0 product and engineering roadmap

This roadmap is separate from 1.0 blockers. Open issues here must not be treated as launch gates.

## Official API evolution

- Reduce dependence on undocumented Substack endpoints as official surfaces appear.
- Keep the current internal-API adapter fail-closed and evidence-backed.
- Prefer read-only probes and disposable-publication canaries before mutating new routes.

## Product surface after 1.0

- Plugin/adapter SDK for additional transports without changing the policy kernel.
- Optional hosted gateway only after local-first authority and credential boundaries stay intact.
- Team/agency workflows as a later track, not a 1.0 requirement.

## Maintenance cycles

- Dependency updates via Renovate, not Dependabot.
- Compatibility and security response remain solo-maintainer: 0 required reviewers, no CODEOWNERS.
- Deprecation notices belong in CHANGELOG and `docs/api/versioning.md`.

## Explicitly not 1.0 blockers

- Native Project auto-add UI toggle
- Renovate Dependency Dashboard issue
- `PROGRAMME_PROJECT_TOKEN` after the programme workflow is on master
- Secret scanning non-provider patterns / validity checks
