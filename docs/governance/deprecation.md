# Deprecation policy

Public CLI flags, MCP tool names, and generated contract fields follow SemVer. This file is the operator-facing policy; [API versioning](../api/versioning.md) is the contract rule.

## Notice

- Announce removals in `CHANGELOG.md` under **Deprecated** before the breaking release.
- Keep the old name as an alias for at least one minor release when practical.
- Breaking local artifact or command changes require a major contract version (`docs/api/versioning.md`).

## What is not a deprecation

- Private Substack endpoint drift. Capability status may change; undocumented routes are not a supported public API.
- Owner-gated live actions (npm deprecate, registry delist, GitHub release edits). Those stay in [incident and rollback](../operations/incident-and-rollback.md).

## Package deprecation

`npm deprecate` and unpublish remain owner-gated. Local dry-run:

```powershell
npm run release:rollback:dry-run
```

Do not claim a registry or npm deprecation completed from that dry-run.

## 1.0

Do not treat this policy as authorization to tag `v1.0.0`. See [1.0 scorecards](./1.0-scorecards.md).
