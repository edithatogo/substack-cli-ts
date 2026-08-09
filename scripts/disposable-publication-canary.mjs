import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TIMEOUT_MS = 20_000;
const ALLOWED_METHODS = {
  create: new Set(["POST"]),
  reconcile: new Set(["GET"]),
  revise: new Set(["PUT", "PATCH"]),
  unschedule: new Set(["POST", "DELETE"]),
  cleanup: new Set(["DELETE"]),
};

function required(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required.`);
  return value.trim();
}

export function validateGuard(env) {
  if (env.GITHUB_EVENT_NAME !== "workflow_dispatch")
    throw new Error("Disposable canary requires workflow_dispatch.");
  if (env.SUBSTACK_CANARY_CONFIRM !== "RUN DISPOSABLE CANARY")
    throw new Error("Disposable canary confirmation phrase is invalid.");
  const target = new URL(required(env.SUBSTACK_DISPOSABLE_PUBLICATION_URL, "SUBSTACK_DISPOSABLE_PUBLICATION_URL"));
  if (target.protocol !== "https:" || !target.hostname.toLowerCase().endsWith(".substack.com"))
    throw new Error("Disposable canary target must be an HTTPS *.substack.com publication.");
  if (target.username || target.password || target.pathname !== "/")
    throw new Error("Disposable canary target must be an origin without credentials or a path.");
  const blocked = (env.SUBSTACK_CANARY_PRODUCTION_URLS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase().replace(/\/$/, ""))
    .filter(Boolean);
  if (blocked.includes(target.origin.toLowerCase()))
    throw new Error("Disposable canary target is listed as a production publication.");
  const runId = required(env.SUBSTACK_CANARY_RUN_ID, "SUBSTACK_CANARY_RUN_ID");
  if (!/^[A-Za-z0-9_.-]{3,128}$/.test(runId)) throw new Error("Canary run ID is invalid.");
  const cookie = required(env.SUBSTACK_TEST_COOKIE, "SUBSTACK_TEST_COOKIE");
  if (/\r|\n/.test(cookie)) throw new Error("SUBSTACK_TEST_COOKIE contains invalid characters.");
  return { target, runId, cookie, marker: `[substack-publisher-canary:${runId}]` };
}

export function parseLifecycleContract(raw) {
  let input;
  try {
    input = JSON.parse(required(raw, "SUBSTACK_DISPOSABLE_CONTRACT_JSON"));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Disposable canary contract must be valid JSON.");
    throw error;
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Disposable canary contract must be an object.");
  const actions = {};
  for (const name of Object.keys(ALLOWED_METHODS)) {
    const action = input.actions?.[name];
    const path = required(action?.path, `actions.${name}.path`);
    const method = required(action?.method, `actions.${name}.method`).toUpperCase();
    if (!path.startsWith("/") || path.startsWith("//"))
      throw new Error(`actions.${name}.path must be same-origin.`);
    if (!ALLOWED_METHODS[name].has(method)) throw new Error(`actions.${name}.method is not allowed.`);
    if (name !== "create" && !path.includes("{draftId}"))
      throw new Error(`actions.${name}.path must include {draftId}.`);
    actions[name] = { path, method };
  }
  return { actions, draftIdPath: input.draftIdPath ?? "id" };
}

function valueAtPath(value, path) {
  return String(path).split(".").reduce((current, key) => current?.[key], value);
}

function endpointFor(target, action, draftId) {
  const path = action.path.replaceAll("{draftId}", encodeURIComponent(String(draftId ?? "")));
  const endpoint = new URL(path, target);
  if (endpoint.origin !== target.origin) throw new Error("Lifecycle endpoint escaped the target origin.");
  return endpoint;
}

async function request(fetchFn, target, action, cookie, body, draftId) {
  const response = await fetchFn(endpointFor(target, action, draftId), {
    method: action.method,
    headers: { accept: "application/json", "content-type": "application/json", cookie },
    body: action.method === "GET" || action.method === "DELETE" ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (response.status === 204) return null;
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > 2 * 1024 * 1024) throw new Error("Response exceeded limit.");
  return text ? JSON.parse(text) : null;
}

export async function runDisposableCanary({ env, fetchFn = fetch, now = () => new Date() }) {
  const guard = validateGuard(env);
  const contract = parseLifecycleContract(env.SUBSTACK_DISPOSABLE_CONTRACT_JSON);
  const receipt = {
    schemaVersion: 1,
    runId: guard.runId,
    targetOrigin: guard.target.origin,
    marker: guard.marker,
    mode: "disposable-publication-write",
    generatedAt: now().toISOString(),
    status: "running",
    cleanup: "not-attempted",
    steps: [],
  };
  let draftId;
  const execute = async (name, body) => {
    try {
      const payload = await request(
        fetchFn,
        guard.target,
        contract.actions[name],
        guard.cookie,
        body,
        draftId,
      );
      receipt.steps.push({ name, status: "passed" });
      return payload;
    } catch (error) {
      receipt.steps.push({ name, status: "uncertain", error: error instanceof Error ? error.message : "Unknown failure" });
      throw error;
    }
  };
  try {
    const created = await execute("create", { title: guard.marker, body: guard.marker, draft: true });
    draftId = valueAtPath(created, contract.draftIdPath);
    if ((typeof draftId !== "string" && typeof draftId !== "number") || String(draftId) === "")
      throw new Error("Create response did not contain a draft ID; cleanup is uncertain.");
    const reconciled = await execute("reconcile");
    if (!JSON.stringify(reconciled).includes(guard.marker)) throw new Error("Reconciliation did not find the unique marker.");
    await execute("revise", { title: `${guard.marker} revised`, body: `${guard.marker} revised`, draft: true });
    await execute("unschedule", { draft: true });
    receipt.status = "passed";
  } catch {
    receipt.status = "uncertain";
  } finally {
    if (draftId !== undefined) {
      try {
        await request(fetchFn, guard.target, contract.actions.cleanup, guard.cookie, undefined, draftId);
        receipt.cleanup = "passed";
        receipt.steps.push({ name: "cleanup", status: "passed" });
      } catch (error) {
        receipt.cleanup = "uncertain";
        receipt.status = "uncertain";
        receipt.steps.push({ name: "cleanup", status: "uncertain", error: error instanceof Error ? error.message : "Unknown failure" });
      }
    } else {
      receipt.cleanup = "uncertain";
      receipt.status = "uncertain";
    }
  }
  return receipt;
}

async function writeReceipt(receipt) {
  const output = resolve("reports/canary/disposable-publication.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

async function main() {
  let receipt;
  try {
    receipt = await runDisposableCanary({ env: process.env });
  } catch (error) {
    receipt = {
      schemaVersion: 1,
      runId: process.env.SUBSTACK_CANARY_RUN_ID ?? "unavailable",
      mode: "disposable-publication-write",
      generatedAt: new Date().toISOString(),
      status: "uncertain",
      cleanup: "not-attempted",
      steps: [
        {
          name: "preflight",
          status: "uncertain",
          error: error instanceof Error ? error.message : "Unknown preflight failure",
        },
      ],
    };
  }
  await writeReceipt(receipt);
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.status !== "passed" || receipt.cleanup !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Disposable canary failed.");
    process.exitCode = 1;
  });
}
