# Frontier Launch and Admin Checklist

This checklist records the external launch, registry, client, Substack admin, support, security, and rollback work that must stay explicit and owner-approved. It does not convert account-gated or unsafe workflows into automatic writes.

## Manual and Account-Gated Boundaries

- npm, GitHub releases, registries, marketplaces, and Substack dashboard changes require authenticated owner/admin action.
- MCP and agent integrations remain read-only or planning-only unless an equivalent CLI write path already requires explicit confirmation.
- Endpoint captures must be redacted before they become fixtures, docs, or decision-record evidence.
- Unsupported or dashboard-only surfaces must stay represented as decision records rather than disappearing from coverage reports.

## Checklist

### npm package publication

- Surface: `npm`
- Owner/admin gate: Requires an authenticated npm account with publish rights and 2FA approval.
- Checks:
  - Run npm run build, npm test, npm run test:coverage, and npm pack --dry-run.
  - Confirm package files exclude local state, browser profiles, traces, and secrets.
  - Publish only from a clean, tagged release commit.
- Evidence:
  - package.json
  - docs/release-checklist.md
  - .npmignore or package files output
- Rollback: Deprecate the bad version and publish a patched semver release; do not unpublish broadly.

### GitHub release, provenance, and changelog

- Surface: `github-release-provenance`
- Owner/admin gate: Requires repository release permissions and verified workflow secrets.
- Checks:
  - Create a signed or verified tag from the release commit.
  - Attach generated artifacts and npm provenance evidence where available.
  - Confirm release notes mention external gates and unsupported Substack surfaces truthfully.
- Evidence:
  - CHANGELOG.md
  - GitHub Actions release run
  - Release artifact checksums
- Rollback: Mark the release as prerelease or withdraw artifacts, then publish a corrective release.

### MCP registry and agent manifest follow-through

- Surface: `mcp-registry`
- Owner/admin gate: Requires registry account access and any marketplace review approval.
- Checks:
  - Validate MCP resources and tools are read-only or planning-only.
  - Confirm manifests do not expose write tools for Substack mutations.
  - Submit registry metadata only after local MCP tests pass.
- Evidence:
  - src/mcp/manifest.ts
  - src/mcp/catalog.ts
  - docs/integrations/ai-readiness-matrix.md
- Rollback: Disable or delist the registry entry and point users back to local CLI installation.

### VS Code extension/client readiness

- Surface: `vs-code`
- Owner/admin gate: Requires marketplace publisher access and extension signing/review where applicable.
- Checks:
  - Verify command examples work from an integrated terminal.
  - Document environment variables without embedding credentials.
  - Keep publish actions CLI-only behind explicit confirmation.
- Evidence:
  - docs/integrations/distribution-targets.md
  - README.md
- Rollback: Unpublish or yank the extension version, then ship a corrected package.

### GitHub Copilot agent usage

- Surface: `copilot`
- Owner/admin gate: Requires user-side Copilot or GitHub agent configuration.
- Checks:
  - Expose roadmap review surfaces without mutation tools.
  - Document recommended prompts for validate, report, gaps, and decisions commands.
  - Confirm generated artifacts are safe to paste into issues and pull requests.
- Evidence:
  - docs/integrations/ai-readiness-matrix.md
  - docs/frontier-coverage-roadmap.md
- Rollback: Remove prompt recommendations and fall back to manual CLI invocation.

### Claude Desktop or compatible MCP client

- Surface: `claude`
- Owner/admin gate: Requires local client configuration by the publication owner.
- Checks:
  - Use read-only MCP resources for matrix, roadmap, and launch checklist review.
  - Keep live Substack writes out of MCP tools.
  - Verify redaction of local paths, tokens, cookies, and account-private details.
- Evidence:
  - src/mcp/resources.ts
  - src/mcp/manifest.ts
- Rollback: Remove the MCP server from client configuration and continue with CLI-only commands.

### Gemini CLI or compatible agent workflow

- Surface: `gemini`
- Owner/admin gate: Requires user-side CLI installation and local repo access.
- Checks:
  - Provide local-first commands for coverage validation and gap review.
  - Document unsupported surfaces as manual/admin gates.
  - Avoid browser-authenticated writes through agent tools.
- Evidence:
  - docs/frontier-coverage-roadmap.md
  - src/frontier-coverage/cli.ts
- Rollback: Disable agent instructions and use the generated Markdown roadmap directly.

### Codex and conductor workflow readiness

- Surface: `codex`
- Owner/admin gate: Requires current workspace branch, pushed PR, and CI visibility.
- Checks:
  - Keep commits per task and push after phase reviews.
  - Check GitHub Actions and address failing checks before closeout.
  - Record external gates instead of overclaiming live launch completion.
- Evidence:
  - tracks/frontier_coverage_roadmap_20260616/plan.md
  - conductor/tracks.md
- Rollback: Revert the task commit or use Conductor revert instructions for the affected track.

### Substack publication admin follow-through

- Surface: `substack-admin`
- Owner/admin gate: Requires authenticated publication owner/admin access.
- Checks:
  - Confirm publication URL, sections, domain, recommendations, Boost, and subscriber settings manually.
  - Use endpoint capture for dashboard-only surfaces before considering automation.
  - Keep destructive or privacy-sensitive actions manual until fixtures and redaction are verified.
- Evidence:
  - docs/substack-feature-coverage.md
  - docs/frontier-coverage-roadmap.md
- Rollback: Restore settings manually in the Substack dashboard and record the incident in run logs.

### Support, docs, and user recovery

- Surface: `support`
- Owner/admin gate: Requires repository maintainer response and public issue triage.
- Checks:
  - Document known unsupported surfaces, fallback commands, and manual recovery paths.
  - Ensure bug reports request redacted fixtures, not credentials or cookies.
  - Keep README and command docs aligned with the generated roadmap.
- Evidence:
  - README.md
  - SECURITY.md
  - docs/api/commands.md
- Rollback: Pin a support advisory and steer users to the last known-good release.

### Security and secret-handling readiness

- Surface: `security`
- Owner/admin gate: Requires maintainer review for any credential, browser, or endpoint-capture changes.
- Checks:
  - Run the secret scan and review fixtures for tokens, cookies, and private publication data.
  - Keep endpoint captures redacted and opt-in.
  - Require explicit confirmation for writes and destructive operations.
- Evidence:
  - SECURITY.md
  - scripts/secret-scan.mjs
  - .gitignore
- Rollback: Revoke exposed credentials, purge unsafe artifacts, and publish a security advisory.

### Rollback and incident response

- Surface: `rollback`
- Owner/admin gate: Requires maintainer access to package, registry, and repository controls.
- Checks:
  - Maintain a last-known-good release pointer.
  - Document how to disable MCP registrations, registry listings, and scheduled automations.
  - Record manual/admin gates that could not be verified live.
- Evidence:
  - docs/release-checklist.md
  - tracks/frontier_coverage_roadmap_20260616/plan.md
- Rollback: Execute package deprecation, registry delisting, and release note corrections in that order.
