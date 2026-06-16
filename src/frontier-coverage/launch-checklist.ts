export const FRONTIER_LAUNCH_CHECKLIST_PATH = "docs/frontier-launch-admin-checklist.md";

export const REQUIRED_LAUNCH_SURFACES = [
  "npm",
  "github-release-provenance",
  "mcp-registry",
  "vs-code",
  "copilot",
  "claude",
  "gemini",
  "codex",
  "substack-admin",
  "support",
  "security",
  "rollback",
] as const;

export type LaunchSurface = (typeof REQUIRED_LAUNCH_SURFACES)[number];

export interface LaunchChecklistItem {
  surface: LaunchSurface;
  title: string;
  ownerGate: string;
  checks: string[];
  evidence: string[];
  rollback: string;
}

export const FRONTIER_LAUNCH_CHECKLIST: LaunchChecklistItem[] = [
  {
    surface: "npm",
    title: "npm package publication",
    ownerGate: "Requires an authenticated npm account with publish rights and 2FA approval.",
    checks: [
      "Run npm run build, npm test, npm run test:coverage, and npm pack --dry-run.",
      "Confirm package files exclude local state, browser profiles, traces, and secrets.",
      "Publish only from a clean, tagged release commit.",
    ],
    evidence: ["package.json", "docs/release-checklist.md", ".npmignore or package files output"],
    rollback:
      "Deprecate the bad version and publish a patched semver release; do not unpublish broadly.",
  },
  {
    surface: "github-release-provenance",
    title: "GitHub release, provenance, and changelog",
    ownerGate: "Requires repository release permissions and verified workflow secrets.",
    checks: [
      "Create a signed or verified tag from the release commit.",
      "Attach generated artifacts and npm provenance evidence where available.",
      "Confirm release notes mention external gates and unsupported Substack surfaces truthfully.",
    ],
    evidence: ["CHANGELOG.md", "GitHub Actions release run", "Release artifact checksums"],
    rollback:
      "Mark the release as prerelease or withdraw artifacts, then publish a corrective release.",
  },
  {
    surface: "mcp-registry",
    title: "MCP registry and agent manifest follow-through",
    ownerGate: "Requires registry account access and any marketplace review approval.",
    checks: [
      "Validate MCP resources and tools are read-only or planning-only.",
      "Confirm manifests do not expose write tools for Substack mutations.",
      "Submit registry metadata only after local MCP tests pass.",
    ],
    evidence: [
      "src/mcp/manifest.ts",
      "src/mcp/catalog.ts",
      "docs/integrations/ai-readiness-matrix.md",
    ],
    rollback:
      "Disable or delist the registry entry and point users back to local CLI installation.",
  },
  {
    surface: "vs-code",
    title: "VS Code extension/client readiness",
    ownerGate:
      "Requires marketplace publisher access and extension signing/review where applicable.",
    checks: [
      "Verify command examples work from an integrated terminal.",
      "Document environment variables without embedding credentials.",
      "Keep publish actions CLI-only behind explicit confirmation.",
    ],
    evidence: ["docs/integrations/distribution-targets.md", "README.md"],
    rollback: "Unpublish or yank the extension version, then ship a corrected package.",
  },
  {
    surface: "copilot",
    title: "GitHub Copilot agent usage",
    ownerGate: "Requires user-side Copilot or GitHub agent configuration.",
    checks: [
      "Expose roadmap review surfaces without mutation tools.",
      "Document recommended prompts for validate, report, gaps, and decisions commands.",
      "Confirm generated artifacts are safe to paste into issues and pull requests.",
    ],
    evidence: ["docs/integrations/ai-readiness-matrix.md", "docs/frontier-coverage-roadmap.md"],
    rollback: "Remove prompt recommendations and fall back to manual CLI invocation.",
  },
  {
    surface: "claude",
    title: "Claude Desktop or compatible MCP client",
    ownerGate: "Requires local client configuration by the publication owner.",
    checks: [
      "Use read-only MCP resources for matrix, roadmap, and launch checklist review.",
      "Keep live Substack writes out of MCP tools.",
      "Verify redaction of local paths, tokens, cookies, and account-private details.",
    ],
    evidence: ["src/mcp/resources.ts", "src/mcp/manifest.ts"],
    rollback:
      "Remove the MCP server from client configuration and continue with CLI-only commands.",
  },
  {
    surface: "gemini",
    title: "Gemini CLI or compatible agent workflow",
    ownerGate: "Requires user-side CLI installation and local repo access.",
    checks: [
      "Provide local-first commands for coverage validation and gap review.",
      "Document unsupported surfaces as manual/admin gates.",
      "Avoid browser-authenticated writes through agent tools.",
    ],
    evidence: ["docs/frontier-coverage-roadmap.md", "src/frontier-coverage/cli.ts"],
    rollback: "Disable agent instructions and use the generated Markdown roadmap directly.",
  },
  {
    surface: "codex",
    title: "Codex and conductor workflow readiness",
    ownerGate: "Requires current workspace branch, pushed PR, and CI visibility.",
    checks: [
      "Keep commits per task and push after phase reviews.",
      "Check GitHub Actions and address failing checks before closeout.",
      "Record external gates instead of overclaiming live launch completion.",
    ],
    evidence: ["tracks/frontier_coverage_roadmap_20260616/plan.md", "conductor/tracks.md"],
    rollback: "Revert the task commit or use Conductor revert instructions for the affected track.",
  },
  {
    surface: "substack-admin",
    title: "Substack publication admin follow-through",
    ownerGate: "Requires authenticated publication owner/admin access.",
    checks: [
      "Confirm publication URL, sections, domain, recommendations, Boost, and subscriber settings manually.",
      "Use endpoint capture for dashboard-only surfaces before considering automation.",
      "Keep destructive or privacy-sensitive actions manual until fixtures and redaction are verified.",
    ],
    evidence: ["docs/substack-feature-coverage.md", "docs/frontier-coverage-roadmap.md"],
    rollback:
      "Restore settings manually in the Substack dashboard and record the incident in run logs.",
  },
  {
    surface: "support",
    title: "Support, docs, and user recovery",
    ownerGate: "Requires repository maintainer response and public issue triage.",
    checks: [
      "Document known unsupported surfaces, fallback commands, and manual recovery paths.",
      "Ensure bug reports request redacted fixtures, not credentials or cookies.",
      "Keep README and command docs aligned with the generated roadmap.",
    ],
    evidence: ["README.md", "SECURITY.md", "docs/api/commands.md"],
    rollback: "Pin a support advisory and steer users to the last known-good release.",
  },
  {
    surface: "security",
    title: "Security and secret-handling readiness",
    ownerGate:
      "Requires maintainer review for any credential, browser, or endpoint-capture changes.",
    checks: [
      "Run the secret scan and review fixtures for tokens, cookies, and private publication data.",
      "Keep endpoint captures redacted and opt-in.",
      "Require explicit confirmation for writes and destructive operations.",
    ],
    evidence: ["SECURITY.md", "scripts/secret-scan.mjs", ".gitignore"],
    rollback:
      "Revoke exposed credentials, purge unsafe artifacts, and publish a security advisory.",
  },
  {
    surface: "rollback",
    title: "Rollback and incident response",
    ownerGate: "Requires maintainer access to package, registry, and repository controls.",
    checks: [
      "Maintain a last-known-good release pointer.",
      "Document how to disable MCP registrations, registry listings, and scheduled automations.",
      "Record manual/admin gates that could not be verified live.",
    ],
    evidence: ["docs/release-checklist.md", "tracks/frontier_coverage_roadmap_20260616/plan.md"],
    rollback:
      "Execute package deprecation, registry delisting, and release note corrections in that order.",
  },
];

export function validateLaunchChecklist(items: LaunchChecklistItem[] = FRONTIER_LAUNCH_CHECKLIST): {
  status: "ready" | "blocked";
  missing: LaunchSurface[];
} {
  const present = new Set(items.map((item) => item.surface));
  const missing = REQUIRED_LAUNCH_SURFACES.filter((surface) => !present.has(surface));
  return { status: missing.length === 0 ? "ready" : "blocked", missing };
}

export function renderLaunchChecklist(
  items: LaunchChecklistItem[] = FRONTIER_LAUNCH_CHECKLIST,
): string {
  const lines = [
    "# Frontier Launch and Admin Checklist",
    "",
    "This checklist records the external launch, registry, client, Substack admin, support, security, and rollback work that must stay explicit and owner-approved. It does not convert account-gated or unsafe workflows into automatic writes.",
    "",
    "## Manual and Account-Gated Boundaries",
    "",
    "- npm, GitHub releases, registries, marketplaces, and Substack dashboard changes require authenticated owner/admin action.",
    "- MCP and agent integrations remain read-only or planning-only unless an equivalent CLI write path already requires explicit confirmation.",
    "- Endpoint captures must be redacted before they become fixtures, docs, or decision-record evidence.",
    "- Unsupported or dashboard-only surfaces must stay represented as decision records rather than disappearing from coverage reports.",
    "",
    "## Checklist",
    "",
  ];

  for (const item of items) {
    lines.push(
      `### ${item.title}`,
      "",
      `- Surface: \`${item.surface}\``,
      `- Owner/admin gate: ${item.ownerGate}`,
      "- Checks:",
      ...item.checks.map((check) => `  - ${check}`),
      "- Evidence:",
      ...item.evidence.map((evidence) => `  - ${evidence}`),
      `- Rollback: ${item.rollback}`,
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
