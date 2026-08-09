# Contributing

Use a focused branch and pull request against `master`. Human approval is not required for this solo-maintainer repository; all required automated checks must pass and actionable comments must be resolved.

## Setup

Use the Node version supported by `package.json`, then install dependencies from the lockfile:

```powershell
npm ci
```

Keep credentials and browser state in ignored local configuration. Never commit `.env`, `.substack-cli/`, session cookies, storage-state files, traces, screenshots, or private publication content.

## Validation

Run the complete gate when practical:

```powershell
npm run quality
```

For a focused iteration, run the directly affected tests plus `npm run typecheck`, `npm run ci`, and `npm run scan:secrets`. The pull request must state exactly which commands ran and why any complete-gate component was deferred.

## Change requirements

- Preserve strict TypeScript and ESM module boundaries.
- Add unit and regression coverage for changed behavior, plus integration or end-to-end evidence where the boundary warrants it.
- Keep CLI, library, MCP, generated schemas, documentation, and fixtures synchronized.
- Map planned work to its Conductor track/task and contract identifiers.
- Disclose material AI assistance under [AI_POLICY.md](AI_POLICY.md).
- Do not perform live publication writes, releases, package publication, or registry submissions without explicit authorization.

Report security vulnerabilities through [GitHub private vulnerability reporting](https://github.com/edithatogo/substack-cli-ts/security/advisories/new), never through a public issue.
