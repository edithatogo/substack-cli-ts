# API Contract Versioning

`substack-cli` publishes a generated local contract for the CLI, MCP surface, first-party JSON artifacts, run-log actions, and safe Substack automation boundaries. This contract documents what this repository owns. It does not claim that Substack private endpoints are stable public APIs.

## Contract Artifacts

- `docs/api/substack-cli.contract.json` records the generated local CLI, MCP, artifact, and safe-surface contract.
- `docs/api/substack-cli.schema.json` records first-party artifact schemas for campaign plans, media/live plans, analytics snapshots, run logs, coverage artifacts, capture evidence, backups, and warehouse reports.
- `src/contracts/` contains the source renderers and schema definitions.
- `npm run contracts:check` rebuilds the contract and fails when generated artifacts are stale.

## Version Fields

- `contract.version` is the semver-style version for the generated local contract. Build metadata such as `+contract.1` identifies the contract generation series for the current package version.
- Top-level `schemaVersion` is the renderer bundle version.
- Per-artifact `schemaVersion` is the strict parser version for that JSON artifact.
- `package.version` is the npm package version that generated the contract.
- Capability status values describe the current safe automation posture: `implemented`, `read-only`, `probe-only`, `planning-only`, `manual-admin`, or `unsupported`.

## Compatibility Rules

- Breaking local artifact or command contract changes require a major contract version change.
- New optional artifact fields, commands, tools, resources, or prompts require a minor contract version change.
- Documentation-only changes, evidence refreshes, and timestamp changes require a patch-level contract version change at most.
- Private Substack endpoint drift updates evidence and capability status only. It does not make the private endpoint a supported public API.
- MCP write tools remain out of scope unless the equivalent CLI mutation is already confirmation-gated, tested, logged, and documented.

## Review Requirements

Before merging a change that alters public local behavior:

1. Run `npm run contracts:generate`.
2. Review generated diffs in `docs/api/substack-cli.contract.json` and `docs/api/substack-cli.schema.json`.
3. Confirm the contract version decision is appropriate for the change.
4. Run `npm run contracts:check`.
5. Document any capability-status changes in the frontier coverage records.

Generated contract diffs are required review evidence for changes to CLI commands, command options, MCP tools/resources/prompts, run-log actions, artifact fields, and safe-surface statuses.
