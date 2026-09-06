import { readFile } from "node:fs/promises";
import { z } from "zod";

const PolicyEnvelopeSchema = z
  .object({
    schemaVersion: z.number().int().positive().default(1).optional(),
    status: z
      .enum(["active", "inactive", "blocked", "lifted", "open", "frozen", "fail-closed"])
      .optional(),
    active: z.boolean().optional(),
    reason: z.string().optional(),
    reasonCode: z.string().optional(),
    freezeUntil: z.string().datetime().optional(),
    resumeAt: z.string().datetime().optional(),
    until: z.string().datetime().optional(),
    note: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough();

const FreezePolicyStatusSchema = z.union([
  z.literal("active"),
  z.literal("inactive"),
  z.literal("blocked"),
  z.literal("lifted"),
  z.literal("open"),
  z.literal("frozen"),
  z.literal("fail-closed"),
]);

type FreezePolicyStatus = z.infer<typeof FreezePolicyStatusSchema>;

export interface SchedulingFreezePolicy {
  schemaVersion: number;
  status?: FreezePolicyStatus | undefined;
  active?: boolean | undefined;
  reason?: string | undefined;
  reasonCode?: string | undefined;
  freezeUntil?: string | undefined;
  resumeAt?: string | undefined;
  until?: string | undefined;
  note?: string | undefined;
  source?: string | undefined;
  raw: unknown;
}

export interface SchedulingFreezeDecision {
  allowed: boolean;
  policyPath?: string | undefined;
  cataloguePath?: string | undefined;
  policy?: SchedulingFreezePolicy;
  reason: string;
  status: "active" | "inactive" | "invalid";
  catalogueSummary?:
    | {
        loaded: boolean;
        reason: string;
        draftCount?: number | undefined;
        postCount?: number | undefined;
        totalItems?: number | undefined;
      }
    | undefined;
}

export async function evaluateSchedulingFreezePolicy(params: {
  freezePolicyPath: string | undefined;
  cataloguePath: string | undefined;
  now?: Date;
}): Promise<SchedulingFreezeDecision> {
  const now = params.now ?? new Date();
  const decision: SchedulingFreezeDecision = {
    allowed: true,
    policyPath: params.freezePolicyPath,
    cataloguePath: params.cataloguePath,
    reason: "Scheduling policy is not active.",
    status: "inactive",
  };

  const catalogueSummary = await validateExternalCatalogue(params.cataloguePath);
  if (catalogueSummary) {
    decision.catalogueSummary = catalogueSummary;
    if (!catalogueSummary.loaded) {
      return {
        allowed: false,
        policyPath: params.freezePolicyPath,
        cataloguePath: params.cataloguePath,
        reason: catalogueSummary.reason,
        status: "invalid",
        catalogueSummary,
      };
    }
  }

  if (!params.freezePolicyPath) {
    return decision;
  }

  const loadResult = await loadFreezePolicy(params.freezePolicyPath);
  if (!loadResult.success) {
    return {
      allowed: false,
      policyPath: params.freezePolicyPath,
      cataloguePath: params.cataloguePath,
      reason: loadResult.reason,
      status: loadResult.status,
      catalogueSummary,
    };
  }
  const policy = loadResult.policy;

  const active = isPolicyActive(policy, now);
  if (!active) {
    return {
      allowed: true,
      policyPath: params.freezePolicyPath,
      cataloguePath: params.cataloguePath,
      policy,
      reason: policy.reason ?? "Scheduling policy is not active.",
      status: "inactive",
      catalogueSummary,
    };
  }

  const blockingReason =
    policy.reason ??
    policy.note ??
    `Scheduling policy indicates active freeze in ${params.freezePolicyPath}`;

  return {
    allowed: false,
    policyPath: params.freezePolicyPath,
    cataloguePath: params.cataloguePath,
    policy,
    reason: blockingReason,
    status: "active",
    catalogueSummary,
  };
}

export function buildSchedulingFreezeBlockReport(
  operation: string,
  decision: SchedulingFreezeDecision,
): Record<string, unknown> {
  return {
    status: "blocked",
    operation,
    reason: decision.reason,
    policyStatus: decision.status,
    policyPath: decision.policyPath,
    cataloguePath: decision.cataloguePath,
    policy: decision.policy,
    catalogueSummary: decision.catalogueSummary,
  };
}

function isPolicyActive(policy: SchedulingFreezePolicy, now: Date): boolean {
  const explicitActiveFromStatus = normalizeStatusActive(policy.status);
  if (explicitActiveFromStatus === "active") return true;
  if (explicitActiveFromStatus === "inactive") return false;

  let active: boolean | undefined;
  if (typeof policy.active === "boolean") {
    active = policy.active;
  }

  const expiry = firstValidDate(policy.freezeUntil ?? policy.resumeAt ?? policy.until);
  if (expiry && expiry.getTime() <= now.getTime()) {
    return false;
  }

  if (active === undefined) {
    // Explicitly malformed policy lacking active/status is treated as frozen.
    return true;
  }

  return active;
}

function normalizeStatusActive(
  status: FreezePolicyStatus | undefined,
): "active" | "inactive" | "unspecified" {
  if (status === undefined) return "unspecified";
  switch (status) {
    case "active":
    case "frozen":
    case "blocked":
      return "active";
    case "inactive":
    case "open":
    case "lifted":
      return "inactive";
    default:
      return "unspecified";
  }
}

function firstValidDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function readTextFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

function validateExternalCatalogue(cataloguePath: string | undefined): Promise<
  | {
      loaded: boolean;
      reason: string;
      draftCount?: number | undefined;
      postCount?: number | undefined;
      totalItems?: number | undefined;
    }
  | undefined
> {
  if (!cataloguePath) return Promise.resolve(undefined);

  return readTextFile(cataloguePath).then((content) => {
    if (content === undefined) {
      return {
        loaded: false,
        reason: `Could not read external catalogue: ${cataloguePath}`,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return {
        loaded: false,
        reason: `External catalogue is not valid JSON: ${cataloguePath}`,
      };
    }

    if (Array.isArray(parsed)) {
      return {
        loaded: true,
        reason: `External catalogue loaded from ${cataloguePath} as array.`,
        totalItems: parsed.length,
      };
    }

    if (typeof parsed === "object" && parsed !== null) {
      const object = parsed as Record<string, unknown>;
      const draftCount = extractArrayCount(object.drafts);
      const postCount = extractArrayCount(object.posts);
      const totalItems = (draftCount ?? 0) + (postCount ?? 0);
      return {
        loaded: true,
        reason: `External catalogue loaded from ${cataloguePath}.`,
        draftCount,
        postCount,
        totalItems,
      };
    }

    return {
      loaded: false,
      reason: `External catalogue must be an object or array: ${cataloguePath}`,
    };
  });
}

function extractArrayCount(value: unknown): number | undefined {
  return Array.isArray(value) ? value.length : undefined;
}

async function loadFreezePolicy(
  policyPath: string,
): Promise<
  | { success: true; policy: SchedulingFreezePolicy }
  | { success: false; reason: string; status: "invalid" }
> {
  const policyText = await readTextFile(policyPath);
  if (policyText === undefined) {
    return {
      success: false,
      reason: `Could not read freeze-policy file: ${policyPath}`,
      status: "invalid",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(policyText);
  } catch {
    return {
      success: false,
      reason: `Freeze-policy file is not valid JSON: ${policyPath}`,
      status: "invalid",
    };
  }

  const parsedPolicy = PolicyEnvelopeSchema.safeParse(parsed);
  if (!parsedPolicy.success) {
    const firstIssue = parsedPolicy.error.issues[0];
    const detail = firstIssue?.message ?? "unknown schema issue";
    return {
      success: false,
      reason: `Freeze-policy schema validation failed (${policyPath}): ${detail}`,
      status: "invalid",
    };
  }

  const policy: SchedulingFreezePolicy = {
    schemaVersion: parsedPolicy.data.schemaVersion ?? 1,
    status: parsedPolicy.data.status,
    active: parsedPolicy.data.active,
    reason: parsedPolicy.data.reason,
    reasonCode: parsedPolicy.data.reasonCode,
    freezeUntil: parsedPolicy.data.freezeUntil,
    resumeAt: parsedPolicy.data.resumeAt,
    until: parsedPolicy.data.until,
    note: parsedPolicy.data.note,
    source: parsedPolicy.data.source,
    raw: parsed,
  };

  return { success: true, policy };
}
