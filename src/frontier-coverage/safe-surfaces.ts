import type { CoverageStatus, SafetyClass } from "./schema.js";

export const SAFE_SURFACE_IDS = [
  "native-video-live-automation",
  "recommendations-boost-probe",
  "subscriber-import-export-segments",
  "analytics-revenue-dashboards",
  "chat-dm-live-chat",
  "publication-admin-writes",
  "integrations-import-crosspost-tokens",
  "draft-lifecycle-mutations",
] as const;

export type SafeSurfaceId = (typeof SAFE_SURFACE_IDS)[number];

export interface ExistingImplementationReference {
  name: string;
  source: "local" | "external";
  reference: string;
  learnings: string[];
  limitations: string[];
}

export interface ImplementationOption {
  id: "A" | "B" | "C";
  label: string;
  summary: string;
  risk: "low" | "medium" | "high";
  selected: boolean;
}

export interface SafeSurface {
  id: SafeSurfaceId;
  title: string;
  status: CoverageStatus;
  safetyClass: SafetyClass;
  capabilityIds: string[];
  currentCommands: string[];
  safeAlternatives: string[];
  manualRunbook: string[];
  endpointCaptureRequirements: string[];
  blockedOperations: string[];
  existingImplementations: ExistingImplementationReference[];
  implementationOptions: ImplementationOption[];
  selectedImplementation: string;
  decisionRecord: {
    id: string;
    reason: string;
  };
}

export interface SafeSurfaceListOutput {
  operation: "coverage.safe-surfaces";
  status: "ready";
  count: number;
  surfaces: SafeSurface[];
}

export interface SafeSurfaceInspectOutput {
  operation: "coverage.safe-surface";
  status: "ready" | "blocked";
  id: string;
  surface?: SafeSurface | undefined;
  message: string;
}

export interface UnsafeWriteBlockedOutput {
  status: "blocked";
  operation: string;
  surfaceId: SafeSurfaceId;
  safetyClass: SafetyClass;
  message: string;
  allowedAlternatives: string[];
  captureRequirements: string[];
}

export const SAFE_SURFACES: SafeSurface[] = [
  {
    id: "native-video-live-automation",
    title: "Native video and live automation",
    status: "planning-only",
    safetyClass: "planning-only",
    capabilityIds: ["native-video-posts", "live-video-rtmp"],
    currentCommands: ["media video plan", "media audio plan", "live plan"],
    safeAlternatives: [
      "Use media video plan to validate local file, post metadata, thumbnail, and transcript readiness.",
      "Use live plan to generate the manual RTMP setup checklist.",
      "Use coverage safe-surface --id native-video-live-automation before considering automation.",
    ],
    manualRunbook: [
      "Open the Substack dashboard manually.",
      "Create the native video post or live event in the dashboard.",
      "Generate stream keys only inside the dashboard and never write them to tracked files.",
      "Capture a redacted browser trace before proposing any endpoint automation.",
    ],
    endpointCaptureRequirements: [
      "Redacted dashboard trace for video upload, metadata save, transcript settings, and publish review.",
      "Redacted live-event trace that excludes stream keys and account secrets.",
      "Fixture proving idempotent dry-run behavior and explicit confirmation boundary.",
    ],
    blockedOperations: [
      "Native video upload automation",
      "Live event creation",
      "RTMP stream-key retrieval",
      "Live chat automation",
    ],
    existingImplementations: [
      localReference("Creator media planning", "src/creator/media-plan.ts", [
        "Already validates files and emits manual next steps.",
        "Keeps live workflows planning-only.",
      ]),
      localReference("Podcast/video API adapter", "src/substack-api/podcast.ts", [
        "Useful as a capture candidate, not proof of a safe native video contract.",
      ]),
      externalReference("NHagar/substack_api", "https://github.com/NHagar/substack_api", [
        "Documents unofficial podcast and recommendation reads.",
      ]),
    ],
    implementationOptions: selectedOptionSet("Keep planning commands plus canonical safety gates."),
    selectedImplementation:
      "Expose planning/reporting only and block unsafe video/live writes until endpoint captures exist.",
    decisionRecord: {
      id: "DR-native-video-live-planning-only",
      reason:
        "Native video and live workflows expose large uploads, stream keys, and live-session state.",
    },
  },
  {
    id: "recommendations-boost-probe",
    title: "Recommendations and Boost",
    status: "probe-only",
    safetyClass: "read-only",
    capabilityIds: ["recommendations-boost-discovery"],
    currentCommands: ["recommendations inspect", "boost inspect"],
    safeAlternatives: [
      "Probe endpoint availability and store diagnostics.",
      "Use the Substack dashboard for recommendation and Boost configuration.",
    ],
    manualRunbook: [
      "Inspect recommendation or Boost availability with the CLI.",
      "Open the dashboard manually for configuration or spend decisions.",
      "Capture redacted endpoint traces before requesting a status upgrade.",
    ],
    endpointCaptureRequirements: [
      "Read-only recommendations response fixture.",
      "Boost configuration fixture proving no payment/spend mutation.",
      "Decision record for any future write path.",
    ],
    blockedOperations: [
      "Creating recommendations",
      "Editing Boost settings",
      "Starting paid Boost spend",
    ],
    existingImplementations: [
      localReference("Community probes", "src/creator/community.ts", [
        "Retries likely endpoints and classifies not-found as dashboard-only.",
      ]),
      externalReference(
        "Awesome Substack lists",
        "https://github.com/awesomelistsio/awesome-substack",
        ["Useful for feature inventory but not endpoint automation."],
      ),
    ],
    implementationOptions: selectedOptionSet("Keep probes and make the decision inspectable."),
    selectedImplementation: "Probe-only CLI and MCP-safe reporting.",
    decisionRecord: {
      id: "DR-recommendations-boost-probe-only",
      reason:
        "Recommendation and Boost writes can affect discovery relationships and paid promotion.",
    },
  },
  {
    id: "subscriber-import-export-segments",
    title: "Subscriber import, export, and segments",
    status: "manual-admin",
    safetyClass: "credential-sensitive",
    capabilityIds: ["subscriber-import-export-segments"],
    currentCommands: ["api subscriber count", "api subscriber list"],
    safeAlternatives: [
      "Use count/list probes for limited diagnostics.",
      "Use the dashboard for export, import, segment, suppression, referral, or gift workflows.",
    ],
    manualRunbook: [
      "Perform exports/imports in the Substack dashboard.",
      "Store exported CSV files outside the repository.",
      "Use local redaction before sharing diagnostics.",
    ],
    endpointCaptureRequirements: [
      "Fixture with synthetic subscriber rows only.",
      "Redaction proof for email, payment, and subscription metadata.",
      "Rollback/recovery plan for imports and segment mutations.",
    ],
    blockedOperations: [
      "Bulk subscriber export",
      "Subscriber import",
      "Segment mutation",
      "Suppression-list mutation",
      "Gift or referral changes",
    ],
    existingImplementations: [
      localReference("Subscriber list adapter", "src/substack-api/subscriber-list.ts", [
        "Provides paginated reads only.",
      ]),
      externalReference(
        "postcli subscriber management issue",
        "https://github.com/postcli/substack/issues/7",
        ["Captures desired CLI surface but not a verified implementation contract."],
      ),
    ],
    implementationOptions: selectedOptionSet("Keep privacy-sensitive workflows manual/admin."),
    selectedImplementation: "Manual/admin workflow with limited read-only probes.",
    decisionRecord: {
      id: "DR-subscriber-privacy-manual-admin",
      reason: "Subscriber import/export/segments can expose or mutate PII and payment state.",
    },
  },
  {
    id: "analytics-revenue-dashboards",
    title: "Analytics and revenue dashboards",
    status: "probe-only",
    safetyClass: "read-only",
    capabilityIds: ["analytics-growth-revenue", "payments-tiers-admin"],
    currentCommands: [
      "analytics snapshot",
      "analytics trend",
      "growth report",
      "api analytics inventory",
      "api billing summary",
    ],
    safeAlternatives: [
      "Capture local snapshots where endpoints are available.",
      "Use trend and growth reports for local analysis.",
      "Use dashboard manual exports for unavailable metrics.",
    ],
    manualRunbook: [
      "Run endpoint probes and note unsupported diagnostics.",
      "Capture dashboard metrics manually when probes are unavailable.",
      "Do not scrape payout, tax, or paid setup pages.",
    ],
    endpointCaptureRequirements: [
      "Redacted dashboard traces for each missing metric family.",
      "Synthetic revenue fixtures with no payment identifiers.",
      "Metric definitions covering denominator, interval, and exclusions.",
    ],
    blockedOperations: [
      "Dashboard scraping",
      "Payout setup changes",
      "Tax form automation",
      "Paid tier mutation",
    ],
    existingImplementations: [
      localReference("Analytics probes", "src/substack-api/analytics.ts", [
        "Provides structured endpoint diagnostics.",
      ]),
      localReference("Billing probes", "src/substack-api/billing.ts", [
        "Keeps revenue and billing reads probe-only.",
      ]),
      externalReference(
        "Playerbs1/substack-publisher-mcp",
        "https://github.com/Playerbs1/substack-publisher-mcp",
        ["Advertises analytics goals but does not establish this repo's safe contracts."],
      ),
    ],
    implementationOptions: selectedOptionSet("Use probes plus local snapshots and reports."),
    selectedImplementation: "Probe-only analytics/revenue with local snapshot alternatives.",
    decisionRecord: {
      id: "DR-analytics-revenue-probe-only",
      reason: "Dashboard-only metrics and revenue pages may contain sensitive commercial data.",
    },
  },
  {
    id: "chat-dm-live-chat",
    title: "Chat, DM, and live chat",
    status: "unsupported",
    safetyClass: "unsupported",
    capabilityIds: ["chat-dm-live-chat-moderation"],
    currentCommands: [],
    safeAlternatives: [
      "Use Substack's app or dashboard manually.",
      "Use comments triage for post comments, which has a separate supported surface.",
    ],
    manualRunbook: [
      "Moderate chat and DMs in Substack-owned clients.",
      "Avoid exporting private conversations to repository artifacts.",
      "Revisit only if Substack publishes a stable public contract.",
    ],
    endpointCaptureRequirements: [
      "Public contract or safe read-only endpoint documentation.",
      "Privacy review for private message content.",
      "Explicit user confirmation model for any future action.",
    ],
    blockedOperations: [
      "Reading private chats",
      "Sending DMs",
      "Live-chat moderation",
      "WebSocket replay",
    ],
    existingImplementations: [
      localReference("Frontier coverage row", "src/frontier-coverage/matrix.ts", [
        "Already records unsupported status.",
      ]),
      externalReference("NHagar/substack_api", "https://github.com/NHagar/substack_api", [
        "Mentions subscriber chats and threads but not a public safety contract.",
      ]),
    ],
    implementationOptions: selectedOptionSet("Expose unsupported status and manual alternatives."),
    selectedImplementation: "Unsupported until a public contract exists.",
    decisionRecord: {
      id: "DR-chat-dm-public-contract-required",
      reason: "Chat and DM surfaces are private and likely WebSocket/app mediated.",
    },
  },
  {
    id: "publication-admin-writes",
    title: "Publication admin writes",
    status: "manual-admin",
    safetyClass: "credential-sensitive",
    capabilityIds: [
      "publication-settings-branding",
      "domain-dns-ssl",
      "payments-tiers-admin",
      "team-roles",
    ],
    currentCommands: [
      "api publication get",
      "api publication get-details",
      "api domain status",
      "api billing summary",
      "api team list",
    ],
    safeAlternatives: [
      "Use read-only probes for settings, domain, billing, and team visibility.",
      "Use the Substack dashboard for writes.",
      "Use dry-run previews where available.",
    ],
    manualRunbook: [
      "Review current state through read-only commands.",
      "Apply admin changes manually in the dashboard or registrar/payment provider.",
      "Capture redacted before/after state when a future automation proposal is needed.",
    ],
    endpointCaptureRequirements: [
      "Redacted settings update trace.",
      "Domain/DNS ownership proof without registrar credentials.",
      "Payment/tax fixture with synthetic values only.",
      "Team role mutation fixture using test users only.",
    ],
    blockedOperations: [
      "Publication settings writes",
      "Logo or favicon upload writes",
      "Domain set/remove",
      "Payment, payout, or tax writes",
      "Team invite/remove/role changes",
    ],
    existingImplementations: [
      localReference("Publication settings probes", "src/substack-api/publication-settings.ts", [
        "Read and dry-run behavior is useful; live writes require stronger gatekeeping.",
      ]),
      localReference("Domain, billing, and team probes", "src/substack-api", [
        "Read-only commands already cover visibility without admin mutation.",
      ]),
    ],
    implementationOptions: selectedOptionSet("Block live admin writes and preserve probes."),
    selectedImplementation: "Manual/admin writes with read-only and dry-run alternatives.",
    decisionRecord: {
      id: "DR-publication-admin-manual-writes",
      reason: "Admin writes can affect branding, domains, payments, taxes, and team access.",
    },
  },
  {
    id: "integrations-import-crosspost-tokens",
    title: "Integrations, imports, crosspost, and tokens",
    status: "manual-admin",
    safetyClass: "credential-sensitive",
    capabilityIds: ["imports-crosspost-integrations"],
    currentCommands: ["api integrations list", "api integrations tokens"],
    safeAlternatives: [
      "List integrations and redacted token metadata only.",
      "Use dashboard/manual tools for imports and cross-post sends.",
    ],
    manualRunbook: [
      "Inspect configured integrations from the CLI.",
      "Perform import and cross-post operations manually after reviewing destination state.",
      "Never print or store raw token values.",
    ],
    endpointCaptureRequirements: [
      "Redacted integration list fixture.",
      "Import dry-run proof with no content mutation.",
      "Cross-post fixture proving idempotency and destination consent.",
      "Token redaction proof.",
    ],
    blockedOperations: [
      "Cross-post sends",
      "WordPress import",
      "RSS import",
      "Token creation or revelation",
    ],
    existingImplementations: [
      localReference("Integrations adapter", "src/substack-api/integrations.ts", [
        "Existing probes and redaction can be reused.",
      ]),
      externalReference(
        "WordPress Substack importer",
        "https://github.com/WordPress/substack-importer",
        ["Shows import file workflows but not safe Substack admin automation."],
      ),
    ],
    implementationOptions: selectedOptionSet(
      "Block mutations and keep probes/redacted token reads.",
    ),
    selectedImplementation: "Probe/manual workflow until safe captures exist.",
    decisionRecord: {
      id: "DR-integrations-import-crosspost-manual",
      reason: "Imports and cross-posting can mutate external platforms or expose secrets.",
    },
  },
  {
    id: "draft-lifecycle-mutations",
    title: "Draft unschedule and published revision",
    status: "planning-only",
    safetyClass: "planning-only",
    capabilityIds: ["draft-unschedule", "draft-revise-published"],
    currentCommands: ["api draft unschedule", "api draft revise", "api draft probe"],
    safeAlternatives: [
      "Use api draft inspect and draft lookup to build non-destructive plans.",
      "Use `api draft probe` to collect endpoint shape evidence before any live attempts.",
      "Perform unschedule/revision through the browser workflow manually until endpoint writes are proven.",
    ],
    manualRunbook: [
      "Validate the targeted draft ID against read-only inventory.",
      "Run `api draft probe` and store the resulting JSON artifact.",
      "Run `api draft unschedule`/`api draft revise` plans and review before applying.",
      "Use browser workflow for corrective actions when probe evidence is absent.",
    ],
    endpointCaptureRequirements: [
      "Confirmed endpoint URL and method for unschedule behavior.",
      "Confirmed endpoint URL and method for published revision keeping canonical URL.",
      "Response schema proof for idempotent-safe operation.",
    ],
    blockedOperations: [
      "Draft unschedule mutation",
      "Published revision mutation",
      "Canonical URL changes",
    ],
    existingImplementations: [
      localReference("Draft planning commands", "src/cli.ts", [
        "Safe planning outputs for unschedule and revise already block unsafe writes.",
      ]),
      localReference("Draft mutation probe", "src/substack-api/draft-operations.ts", [
        "Provides read-only endpoint-shape probes for safe planning and evidence capture.",
      ]),
    ],
    implementationOptions: selectedOptionSet(
      "Keep local planning mandatory with mandatory probe artifact before enabling writes.",
    ),
    selectedImplementation:
      "Keep planning-only behavior by default, and gate any future live execution behind explicit endpoint evidence.",
    decisionRecord: {
      id: "DR-draft-lifecycle-planning-only",
      reason:
        "Unscheduling and published revision directly affect public post state and can invalidate publication history.",
    },
  },
];

export function buildSafeSurfaceListOutput(): SafeSurfaceListOutput {
  return {
    operation: "coverage.safe-surfaces",
    status: "ready",
    count: SAFE_SURFACES.length,
    surfaces: SAFE_SURFACES,
  };
}

export function buildSafeSurfaceInspectOutput(id: string): SafeSurfaceInspectOutput {
  const surface = getSafeSurface(id);
  return {
    operation: "coverage.safe-surface",
    status: surface ? "ready" : "blocked",
    id,
    surface,
    message: surface ? "Safe surface found." : "Safe surface ID was not found.",
  };
}

export function getSafeSurface(id: string): SafeSurface | undefined {
  return SAFE_SURFACES.find((surface) => surface.id === id);
}

export function buildUnsafeWriteBlockedOutput(
  surfaceId: SafeSurfaceId,
  operation: string,
): UnsafeWriteBlockedOutput {
  const surface = requireSafeSurface(surfaceId);
  return {
    status: "blocked",
    operation,
    surfaceId,
    safetyClass: surface.safetyClass,
    message: `${operation} is blocked because ${surface.title} is ${surface.status} until safe endpoint captures exist.`,
    allowedAlternatives: surface.safeAlternatives,
    captureRequirements: surface.endpointCaptureRequirements,
  };
}

function requireSafeSurface(id: SafeSurfaceId): SafeSurface {
  const surface = getSafeSurface(id);
  if (!surface) throw new Error(`Safe surface is not registered: ${id}`);
  return surface;
}

function localReference(
  name: string,
  reference: string,
  learnings: string[],
): ExistingImplementationReference {
  return {
    name,
    source: "local",
    reference,
    learnings,
    limitations: ["Does not authorize unsafe writes without the selected safety gate."],
  };
}

function externalReference(
  name: string,
  reference: string,
  learnings: string[],
): ExistingImplementationReference {
  return {
    name,
    source: "external",
    reference,
    learnings,
    limitations: [
      "Useful for comparison only; this repository still requires local tests and redacted fixtures.",
    ],
  };
}

function selectedOptionSet(selectedSummary: string): ImplementationOption[] {
  return [
    {
      id: "A",
      label: "Document only",
      summary: "Keep behavior unchanged and document the boundary.",
      risk: "medium",
      selected: false,
    },
    {
      id: "B",
      label: "Safe registry and gates",
      summary: selectedSummary,
      risk: "low",
      selected: true,
    },
    {
      id: "C",
      label: "Automate writes",
      summary: "Implement write automation before safe endpoint captures exist.",
      risk: "high",
      selected: false,
    },
  ];
}
