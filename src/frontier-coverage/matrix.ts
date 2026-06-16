import type { CapabilityDomain, CoverageCapability, CoverageMatrix } from "./schema.js";
import { validateCoverageMatrix } from "./schema.js";

export const FRONTIER_COVERAGE_MATRIX: CoverageMatrix = {
  schemaVersion: 1,
  generatedAt: "2026-06-16T00:00:00Z",
  capabilities: [
    implemented({
      id: "post-draft-publish-schedule",
      name: "Draft, publish, and schedule posts",
      domain: "post-editor",
      primaryPath: "cli",
      fallbackPath: "browser",
      safetyClass: "write-with-confirmation",
      evidence: [
        evidence("source", "Publish CLI commands", "src/cli.ts"),
        evidence("test", "Publish write tests", "src/substack-api/publish-write.test.ts"),
        evidence("doc", "Command reference", "docs/api/commands.md"),
      ],
      nextAction:
        "Keep browser and API transport fixtures current when Substack editor flows change.",
    }),
    implemented({
      id: "post-editor-metadata",
      name: "Post metadata, audience, tags, sections, SEO, and social fields",
      domain: "post-editor",
      primaryPath: "cli",
      fallbackPath: "browser",
      safetyClass: "write-with-confirmation",
      evidence: [
        evidence("source", "Front matter parser", "src/parser/frontmatter.ts"),
        evidence("test", "Front matter tests", "src/parser/frontmatter.test.ts"),
        evidence("doc", "Creator OS commands", "docs/api/commands.md"),
      ],
      nextAction: "Add endpoint evidence when Substack exposes new editor metadata fields.",
    }),
    implemented({
      id: "image-media-upload",
      name: "Image media upload and Markdown image rendering",
      domain: "native-media",
      primaryPath: "cli",
      fallbackPath: "browser",
      safetyClass: "write-with-confirmation",
      evidence: [
        evidence("source", "Media upload adapter", "src/substack-api/media-upload.ts"),
        evidence("test", "Media upload tests", "src/substack-api/media-upload.test.ts"),
        evidence("fixture", "Live image upload contract", "fixtures/drafts"),
      ],
      nextAction: "Refresh media upload fixtures after any Substack upload contract change.",
    }),
    planningOnly({
      id: "native-video-posts",
      name: "Native video posts, transcripts, thumbnails, clips, and podcast audio extraction",
      domain: "native-media",
      evidence: [
        evidence("source", "Media planning module", "src/creator/media-plan.ts"),
        evidence("test", "Media planning tests", "src/creator/media-plan.test.ts"),
        evidence(
          "official-doc",
          "Substack video posts",
          "https://support.substack.com/hc/en-us/articles/21093671091220-Guide-to-video-posts-on-Substack",
        ),
      ],
      decisionRecord: decision(
        "DR-native-video-capture",
        "Native video upload automation remains capture-first until dashboard endpoint contracts are verified with redacted fixtures.",
      ),
      nextAction: "Capture safe dashboard traces for native video upload and transcript settings.",
    }),
    planningOnly({
      id: "live-video-rtmp",
      name: "Live video, scheduled events, audience controls, recordings, and RTMP",
      domain: "live",
      evidence: [
        evidence("source", "Live planning CLI", "src/cli.ts"),
        evidence("test", "Media/live planning tests", "src/creator/media-plan.test.ts"),
        evidence(
          "official-doc",
          "Substack RTMP live video",
          "https://support.substack.com/hc/en-us/articles/32070353475860-Live-video-on-Substack-via-RTMP",
        ),
      ],
      decisionRecord: decision(
        "DR-live-video-capture",
        "Live video uses planning-only coverage because stream keys, audience gates, co-hosting, chat, and recordings are account/live-session sensitive.",
      ),
      nextAction:
        "Document manual RTMP setup and only automate after endpoint capture proves safe.",
    }),
    implemented({
      id: "creator-campaign-planning",
      name: "Campaign planning, validation, execution readiness, and reports",
      domain: "creator-os",
      primaryPath: "cli",
      fallbackPath: "local-only",
      evidence: [
        evidence("source", "Campaign planner", "src/creator/campaign.ts"),
        evidence("test", "Campaign planner tests", "src/creator/campaign.test.ts"),
        evidence("doc", "Creator OS Track 41", "tracks/41-creator-os-upgrade.md"),
      ],
      nextAction: "Connect campaign coverage rows to generated roadmap output.",
    }),
    implemented({
      id: "notes-create-campaign",
      name: "Notes create/list/get and campaign note schedule validation",
      domain: "notes-community",
      primaryPath: "cli",
      fallbackPath: "api",
      safetyClass: "write-with-confirmation",
      evidence: [
        evidence("source", "Notes API adapter", "src/substack-api/notes.ts"),
        evidence("test", "Notes tests", "src/substack-api/notes.test.ts"),
        evidence(
          "official-doc",
          "Substack Notes",
          "https://support.substack.com/hc/en-us/articles/14564821756308-Getting-started-on-Substack-Notes",
        ),
      ],
      nextAction: "Keep campaign note validation aligned with post URL and schedule rules.",
    }),
    probeOnly({
      id: "recommendations-boost-discovery",
      name: "Recommendations, endorsements, digests, and Boost inspection",
      domain: "notes-community",
      evidence: [
        evidence("source", "Community inspection helpers", "src/creator/community.ts"),
        evidence("test", "Community tests", "src/creator/community.test.ts"),
        evidence(
          "official-doc",
          "Substack Boost",
          "https://support.substack.com/hc/en-us/articles/9674586580244-What-is-Substack-Boost",
        ),
      ],
      decisionRecord: decision(
        "DR-recommendations-boost",
        "Recommendations and Boost write/configuration endpoints are dashboard-gated; CLI coverage is inspection and diagnostics until safe endpoints are discovered.",
      ),
      nextAction:
        "Capture recommendation and Boost dashboard endpoints, then decide whether write automation is appropriate.",
    }),
    readOnly({
      id: "subscriber-count-list",
      name: "Subscriber counts and subscriber list pagination",
      domain: "subscribers-growth",
      evidence: [
        evidence("source", "Subscriber list adapter", "src/substack-api/subscriber-list.ts"),
        evidence("test", "Subscriber list tests", "src/substack-api/subscriber-list.test.ts"),
        evidence("doc", "Track 19 subscriber management", "conductor/tracks.md"),
      ],
      nextAction: "Keep exports/imports manual-admin until endpoint discovery proves safe.",
    }),
    probeOnly({
      id: "subscriber-import-export-segments",
      name: "Subscriber import, export, segments, suppression, gift, and referral flows",
      domain: "subscribers-growth",
      evidence: [
        evidence("doc", "Remaining platform gaps", "tracks/31-remaining-platform-gaps.md"),
        evidence("doc", "Subscriber Track 19", "conductor/tracks.md"),
      ],
      decisionRecord: decision(
        "DR-subscriber-admin",
        "Subscriber mutation and export workflows are privacy-sensitive and remain manual/admin until endpoints and redaction rules are verified.",
      ),
      nextAction:
        "Define redacted fixtures and manual recovery paths before considering subscriber writes.",
      ownerDependency:
        "Publication owner/admin access may be required for exports, imports, and segment changes.",
    }),
    probeOnly({
      id: "analytics-growth-revenue",
      name: "Post metrics, opens, clicks, read rate, growth, revenue, payouts, and taxes",
      domain: "analytics-revenue",
      evidence: [
        evidence("source", "Analytics probes", "src/substack-api/analytics.ts"),
        evidence("source", "Billing probes", "src/substack-api/billing.ts"),
        evidence(
          "official-doc",
          "Substack metrics",
          "https://support.substack.com/hc/en-us/articles/5320347155860-A-guide-to-Substack-metrics",
        ),
      ],
      decisionRecord: decision(
        "DR-analytics-dashboard",
        "Many analytics and revenue views are dashboard-only; CLI coverage remains probe/read diagnostics plus local snapshots until contracts are verified.",
      ),
      nextAction:
        "Map dashboard-only metrics to endpoint captures or manual snapshot instructions.",
    }),
    implemented({
      id: "comments-moderation",
      name: "Comments listing, replies, approve/delete/pin, and triage",
      domain: "moderation",
      primaryPath: "cli",
      fallbackPath: "api",
      safetyClass: "write-with-confirmation",
      evidence: [
        evidence("source", "Comment list adapter", "src/substack-api/comment-list.ts"),
        evidence("test", "Comment list tests", "src/substack-api/comment-list.test.ts"),
        evidence("doc", "Track 20 comments moderation", "conductor/tracks.md"),
      ],
      nextAction:
        "Add decision records for mute/ban/spam quarantine if endpoints remain unavailable.",
    }),
    unsupported({
      id: "chat-dm-live-chat-moderation",
      name: "Chat, direct messages, and live-chat moderation controls",
      domain: "moderation",
      evidence: [evidence("doc", "Community gaps", "tracks/31-remaining-platform-gaps.md")],
      decisionRecord: decision(
        "DR-chat-dm-app-only",
        "Chat and DM surfaces are app/WebSocket oriented and are not safe CLI automation targets without a public contract.",
      ),
      nextAction:
        "Keep manual/admin documentation current and revisit only if Substack publishes stable interfaces.",
    }),
    readOnly({
      id: "publication-settings-branding",
      name: "Publication settings, branding, welcome page, and checklist state",
      domain: "publication-admin",
      evidence: [
        evidence(
          "source",
          "Publication settings adapter",
          "src/substack-api/publication-settings.ts",
        ),
        evidence(
          "test",
          "Publication settings tests",
          "src/substack-api/publication-settings.test.ts",
        ),
        evidence("doc", "Track 17 publication settings", "conductor/tracks.md"),
      ],
      nextAction: "Keep writes manual-admin until safe update endpoints are captured.",
    }),
    readOnly({
      id: "domain-dns-ssl",
      name: "Custom domain, DNS, and SSL status",
      domain: "publication-admin",
      evidence: [
        evidence("source", "Domain status adapter", "src/substack-api/domain.ts"),
        evidence("test", "Domain status tests", "src/substack-api/domain.test.ts"),
        evidence("doc", "Track 18 custom domain management", "conductor/tracks.md"),
      ],
      nextAction: "Keep DNS mutation and registrar actions manual/admin.",
      ownerDependency: "Publication owner and DNS registrar credentials are external gates.",
    }),
    probeOnly({
      id: "payments-tiers-admin",
      name: "Payments, subscription tiers, payouts, taxes, and paid publication setup",
      domain: "publication-admin",
      evidence: [
        evidence("source", "Billing probes", "src/substack-api/billing.ts"),
        evidence("test", "Billing tests", "src/substack-api/billing.test.ts"),
        evidence("doc", "Track 23 revenue and billing", "conductor/tracks.md"),
      ],
      decisionRecord: decision(
        "DR-payments-admin",
        "Payment and tax setup remains admin/manual because it involves sensitive account, tax, and payout data.",
      ),
      nextAction: "Maintain checklist-only support and avoid collecting payment/tax secrets.",
      ownerDependency: "Publication owner/admin must complete payment and tax setup.",
    }),
    readOnly({
      id: "team-roles",
      name: "Team member list and role visibility",
      domain: "publication-admin",
      evidence: [
        evidence("source", "Team adapter", "src/substack-api/team.ts"),
        evidence("test", "Team tests", "src/substack-api/team.test.ts"),
        evidence("doc", "Track 27 team management", "conductor/tracks.md"),
      ],
      nextAction: "Keep invite/remove/role changes manual-admin until safe endpoints are captured.",
    }),
    probeOnly({
      id: "imports-crosspost-integrations",
      name: "WordPress/RSS imports, cross-posting, YouTube connection, podcast distribution, and tokens",
      domain: "integrations-import-export",
      evidence: [
        evidence("source", "Integrations probes", "src/substack-api/integrations.ts"),
        evidence("test", "Integrations tests", "src/substack-api/integrations.test.ts"),
        evidence("doc", "Track 26 cross-posting and integrations", "conductor/tracks.md"),
      ],
      decisionRecord: decision(
        "DR-integrations-admin",
        "Import, cross-post, and token workflows can be destructive or secret-bearing; unsupported endpoints remain probe/manual until verified.",
      ),
      nextAction: "Add endpoint-capture records for each integration before write automation.",
    }),
    implemented({
      id: "npm-github-release",
      name: "npm package, GitHub release metadata, provenance, changelog, and rollback notes",
      domain: "distribution-agent",
      primaryPath: "cli",
      fallbackPath: "manual-admin",
      safetyClass: "external-gate",
      evidence: [
        evidence("doc", "Package publishing Track 28", "conductor/tracks.md"),
        evidence("doc", "Release checklist", "docs/release-checklist.md"),
        evidence("source", "Package metadata", "package.json"),
      ],
      nextAction:
        "Require live npm publish and release actions to remain explicit owner/admin gates.",
      ownerDependency: "npm and GitHub release credentials are external gates.",
    }),
    implemented({
      id: "mcp-client-distribution",
      name: "MCP registry, VS Code, Copilot, Claude, Gemini, and Codex setup verification",
      domain: "distribution-agent",
      primaryPath: "cli",
      fallbackPath: "manual-admin",
      safetyClass: "external-gate",
      evidence: [
        evidence("source", "MCP catalog", "src/mcp/catalog.ts"),
        evidence("test", "MCP catalog tests", "src/mcp/catalog.test.ts"),
        evidence("doc", "AI integration readiness", "docs/integrations/ai-readiness-matrix.md"),
      ],
      nextAction:
        "Keep marketplace/registry submission as external gates until authenticated publisher credentials are available.",
      ownerDependency: "Registry and client marketplace accounts are external gates.",
    }),
  ],
};

export function getCoverageMatrix(): CoverageMatrix {
  return FRONTIER_COVERAGE_MATRIX;
}

export function getCoverageCapabilitiesByDomain(domain: CapabilityDomain): CoverageCapability[] {
  return FRONTIER_COVERAGE_MATRIX.capabilities.filter((capability) => capability.domain === domain);
}

export function assertCoverageMatrixReady(matrix = FRONTIER_COVERAGE_MATRIX): void {
  const report = validateCoverageMatrix(matrix);
  if (report.status === "blocked") {
    throw new Error(
      report.issues.map((issue) => `${issue.capabilityId}: ${issue.message}`).join("\n"),
    );
  }
}

function implemented(
  input: Omit<
    CoverageCapability,
    | "status"
    | "paths"
    | "primaryPath"
    | "fallbackPath"
    | "manualPath"
    | "safetyClass"
    | "missingEvidence"
  > & {
    primaryPath?: CoverageCapability["primaryPath"];
    fallbackPath?: CoverageCapability["fallbackPath"];
    safetyClass?: CoverageCapability["safetyClass"];
  },
): CoverageCapability {
  return {
    status: "implemented",
    paths: uniquePaths([
      input.primaryPath ?? "cli",
      input.fallbackPath ?? "browser",
      "manual-admin",
    ]),
    primaryPath: input.primaryPath ?? "cli",
    fallbackPath: input.fallbackPath ?? "browser",
    manualPath: "manual-admin",
    safetyClass: input.safetyClass ?? "read-only",
    missingEvidence: [],
    ...input,
  };
}

function readOnly(
  input: Omit<
    CoverageCapability,
    | "status"
    | "paths"
    | "primaryPath"
    | "fallbackPath"
    | "manualPath"
    | "safetyClass"
    | "missingEvidence"
  >,
): CoverageCapability {
  return {
    status: "read-only",
    paths: ["cli", "api", "browser", "manual-admin"],
    primaryPath: "cli",
    fallbackPath: "api",
    manualPath: "manual-admin",
    safetyClass: "read-only",
    missingEvidence: [],
    ...input,
  };
}

function probeOnly(
  input: Omit<
    CoverageCapability,
    | "status"
    | "paths"
    | "primaryPath"
    | "fallbackPath"
    | "manualPath"
    | "safetyClass"
    | "missingEvidence"
  >,
): CoverageCapability {
  return {
    status: "probe-only",
    paths: ["cli", "api", "browser", "manual-admin"],
    primaryPath: "cli",
    fallbackPath: "browser",
    manualPath: "manual-admin",
    safetyClass: "read-only",
    missingEvidence: ["Verified live endpoint contract"],
    ...input,
  };
}

function planningOnly(
  input: Omit<
    CoverageCapability,
    | "status"
    | "paths"
    | "primaryPath"
    | "fallbackPath"
    | "manualPath"
    | "safetyClass"
    | "missingEvidence"
  >,
): CoverageCapability {
  return {
    status: "planning-only",
    paths: ["cli", "mcp-planning", "manual-admin"],
    primaryPath: "cli",
    fallbackPath: "mcp-planning",
    manualPath: "manual-admin",
    safetyClass: "planning-only",
    missingEvidence: ["Verified safe live automation contract"],
    ...input,
  };
}

function unsupported(
  input: Omit<
    CoverageCapability,
    | "status"
    | "paths"
    | "primaryPath"
    | "fallbackPath"
    | "manualPath"
    | "safetyClass"
    | "missingEvidence"
  >,
): CoverageCapability {
  return {
    status: "unsupported",
    paths: ["manual-admin"],
    safetyClass: "unsupported",
    missingEvidence: ["Public or safely captured automation contract"],
    ...input,
  };
}

function evidence(
  kind: CoverageCapability["evidence"][number]["kind"],
  label: string,
  ref: string,
) {
  return { kind, label, ref };
}

function decision(id: string, reason: string) {
  return { id, reason, nextReview: "before marking this capability implemented" };
}

function uniquePaths(paths: CoverageCapability["paths"]): CoverageCapability["paths"] {
  return [...new Set(paths)];
}
