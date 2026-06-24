# Frontier Coverage Maintenance

This guide explains how to update the frontier coverage system without overclaiming unsupported or account-gated Substack surfaces.

## Add or Update a Capability

1. Add or edit the capability row in `src/frontier-coverage/matrix.ts`.
2. Choose the narrowest truthful status:
   - `implemented`: working CLI path with tests, evidence, fallback, and manual/admin path.
   - `read-only`: safe inspection exists, but no write path is exposed.
   - `probe-only`: endpoint or dashboard discovery exists, but the contract is not safe for automation.
   - `planning-only`: local plan generation exists, but live execution stays manual.
   - `manual-admin`: the workflow belongs in the Substack dashboard or an external registry/account.
   - `unsupported`: the surface is app-only, private, unsafe, or outside this CLI boundary.
3. Include evidence:
   - **source**: Implementation modules that establish the capability.
   - **test**: Unit, smoke, contract, or fixture coverage that verifies behavior.
   - **doc**: Local documentation that explains the supported workflow.
   - **official-doc**: Substack support pages or external references used as current evidence.
   - **endpoint-capture**: Redacted dashboard or API traces reviewed before automation changes.
   - **decision-record**: Rationale for non-implemented, manual, or unsafe surfaces.
4. Keep `primaryPath`, `fallbackPath`, and `manualPath` explicit unless the helper default is correct.
5. Run:

```bash
npm run build
npm test
node dist/cli.js coverage validate
node dist/cli.js coverage safe-surfaces
node dist/cli.js coverage safe-surface --id native-video-live-automation
node dist/cli.js coverage report --format markdown --out docs/frontier-coverage-roadmap.md
```

## Evidence and Decision Records

Every non-implemented, capture-first, planning-only, manual/admin, or unsupported row needs a decision record. A decision record should explain why the surface is not automated and what must happen before the status changes.

Do not remove a missing surface from the matrix to make coverage look better. If a surface cannot be automated, keep it visible with `unsupported`, `probe-only`, `planning-only`, or `manual-admin`.

Use the promotion ladder in [Creator OS Completion and Hardening Roadmap](creator-os-completion-roadmap.md) before changing a surface from planning/probe/manual/unsupported into a write-capable implementation. The ladder requires public evidence, a manual runbook, redacted traces, fixtures, contract tests, dry-run adapters, and finally explicit confirmed writes.

When a feature graduates, update all of these together:

- `src/frontier-coverage/matrix.ts`
- generated coverage roadmap and launch checklist
- decision record or ADR that explains the graduation
- local artifact schema or contract version when the public CLI/MCP surface changes
- tests or fixtures that prove the new status
- release notes that call out new write behavior and rollback paths

## Examples

### Fully Covered Feature

Draft publishing is `implemented` because it has a CLI path, API/browser fallback evidence, tests, docs, and manual/admin recovery through the Substack dashboard.

### Read-Only Feature

Publication settings inspection is `read-only` because the CLI can inspect settings safely while update operations remain manual/admin until safe endpoints and rollback coverage are verified.

### Capture-First Feature

Recommendations and Boost are `probe-only` because dashboard endpoints require capture, redaction, and fixture review before any automation can be considered.

### Manual/Admin Gate

npm publication, MCP registry submission, marketplace setup, and Substack publication admin changes remain external owner/admin gates. The coverage system can validate readiness and record run logs, but the owner performs the authenticated launch action.

## Regenerate Human-Readable Artifacts

The generated roadmap and launch checklist must stay synchronized with TypeScript renderers.

```bash
npm run build
node --input-type=module -e "import { writeFile } from 'node:fs/promises'; import { renderCoverageRoadmap, FRONTIER_COVERAGE_ROADMAP_PATH } from './dist/frontier-coverage/roadmap.js'; await writeFile(FRONTIER_COVERAGE_ROADMAP_PATH, renderCoverageRoadmap(), 'utf8');"
node --input-type=module -e "import { writeFile } from 'node:fs/promises'; import { renderLaunchChecklist, FRONTIER_LAUNCH_CHECKLIST_PATH } from './dist/frontier-coverage/launch-checklist.js'; await writeFile(FRONTIER_LAUNCH_CHECKLIST_PATH, renderLaunchChecklist(), 'utf8');"
```

## Launch and Admin Follow-Through

Use `docs/frontier-launch-admin-checklist.md` for registry, client, npm, GitHub release, Substack admin, support, security, and rollback work. Passing local validation means the repo is ready for review; it does not mean external launches or dashboard changes were performed.
