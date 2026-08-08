import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} is required.`);
  return value.trim();
}

export function validateTarget(rawUrl) {
  const target = new URL(requireString(rawUrl, "SUBSTACK_CANARY_URL"));
  if (target.protocol !== "https:") throw new Error("Canary target must use HTTPS.");
  if (target.username || target.password) throw new Error("Canary target must not contain credentials.");
  const host = target.hostname.toLowerCase();
  if (host !== "substack.com" && !host.endsWith(".substack.com"))
    throw new Error("Authenticated canary target must be a substack.com host.");
  target.hash = "";
  target.search = "";
  return target;
}

function validateMarkerList(value, label, { required = false } = {}) {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value) || (required && value.length === 0))
    throw new Error(`${label} must be ${required ? "a non-empty" : "an"} array.`);
  return value.map((entry, index) => requireString(entry, `${label}[${index}]`));
}

export function parseContract(rawContract) {
  const input = requireString(rawContract, "SUBSTACK_CANARY_CONTRACT_JSON");
  let contract;
  try {
    contract = JSON.parse(input);
  } catch {
    throw new Error("SUBSTACK_CANARY_CONTRACT_JSON must be valid JSON.");
  }
  if (!contract || typeof contract !== "object" || Array.isArray(contract))
    throw new Error("Canary contract must be an object.");
  const html = contract.html;
  if (!html || typeof html !== "object" || Array.isArray(html))
    throw new Error("Canary contract requires an html object.");
  const requiredMarkers = validateMarkerList(html.requiredMarkers, "html.requiredMarkers", {
    required: true,
  });
  const forbiddenMarkers = validateMarkerList(html.forbiddenMarkers, "html.forbiddenMarkers");
  if (!Array.isArray(contract.json) || contract.json.length === 0)
    throw new Error("Canary contract requires at least one JSON probe.");
  const json = contract.json.map((probe, probeIndex) => {
    if (!probe || typeof probe !== "object" || Array.isArray(probe))
      throw new Error(`json[${probeIndex}] must be an object.`);
    const path = requireString(probe.path, `json[${probeIndex}].path`);
    if (!path.startsWith("/") || path.startsWith("//"))
      throw new Error(`json[${probeIndex}].path must be a same-origin absolute path.`);
    if (!Array.isArray(probe.requiredPaths) || probe.requiredPaths.length === 0)
      throw new Error(`json[${probeIndex}].requiredPaths must be a non-empty array.`);
    const requiredPaths = probe.requiredPaths.map((entry, pathIndex) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry))
        throw new Error(`json[${probeIndex}].requiredPaths[${pathIndex}] must be an object.`);
      const fieldPath = requireString(entry.path, `requiredPaths[${pathIndex}].path`);
      const type = requireString(entry.type, `requiredPaths[${pathIndex}].type`);
      if (!new Set(["array", "boolean", "number", "object", "string"]).has(type))
        throw new Error(`Unsupported expected type: ${type}.`);
      return { path: fieldPath, type };
    });
    return { path, requiredPaths };
  });
  return { html: { requiredMarkers, forbiddenMarkers }, json };
}

function valueAtPath(value, path) {
  return path.split(".").reduce((current, segment) => {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    return current[segment];
  }, value);
}

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value !== null && typeof value === "object") return "object";
  return typeof value;
}

async function boundedText(response, maximumBytes) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes)
    throw new Error(`Response exceeds ${maximumBytes} bytes.`);
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > maximumBytes)
    throw new Error(`Response exceeds ${maximumBytes} bytes.`);
  return body;
}

async function checkHtml(fetchFn, target, contract) {
  const response = await fetchFn(target, {
    headers: { accept: "text/html", "user-agent": "substack-publisher-drift-canary/1" },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTML probe returned HTTP ${response.status}.`);
  if (!response.headers.get("content-type")?.toLowerCase().includes("text/html"))
    throw new Error("HTML probe content type drifted from text/html.");
  const body = await boundedText(response, MAX_HTML_BYTES);
  for (const marker of contract.requiredMarkers) {
    if (!body.includes(marker)) throw new Error(`Required HTML marker is absent: ${marker}`);
  }
  for (const marker of contract.forbiddenMarkers) {
    if (body.includes(marker)) throw new Error(`Forbidden HTML marker is present: ${marker}`);
  }
}

async function checkJson(fetchFn, target, cookie, probe) {
  const endpoint = new URL(probe.path, target);
  if (endpoint.origin !== target.origin) throw new Error("JSON probe escaped the configured origin.");
  const response = await fetchFn(endpoint, {
    headers: {
      accept: "application/json",
      cookie,
      "user-agent": "substack-publisher-drift-canary/1",
    },
    redirect: "error",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${probe.path} returned HTTP ${response.status}.`);
  if (!response.headers.get("content-type")?.toLowerCase().includes("json"))
    throw new Error(`${probe.path} content type drifted from JSON.`);
  const body = await boundedText(response, MAX_JSON_BYTES);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`${probe.path} returned malformed JSON.`);
  }
  for (const expected of probe.requiredPaths) {
    const actual = valueType(valueAtPath(payload, expected.path));
    if (actual !== expected.type)
      throw new Error(`${probe.path} field ${expected.path} expected ${expected.type}, received ${actual}.`);
  }
}

export async function runCanary({ fetchFn = fetch, targetUrl, cookie, contract, runId = "local" }) {
  const target = validateTarget(targetUrl);
  const sessionCookie = requireString(cookie, "SUBSTACK_TEST_COOKIE");
  if (/\r|\n/.test(sessionCookie)) throw new Error("SUBSTACK_TEST_COOKIE contains invalid characters.");
  const checks = [];
  const execute = async (name, operation) => {
    try {
      await operation();
      checks.push({ name, status: "passed" });
    } catch (error) {
      checks.push({ name, status: "failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  };
  await execute("html:homepage", () => checkHtml(fetchFn, target, contract.html));
  for (const probe of contract.json) {
    await execute(`json:${probe.path}`, () => checkJson(fetchFn, target, sessionCookie, probe));
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runId,
    targetOrigin: target.origin,
    mode: "read-only",
    status: checks.every((check) => check.status === "passed") ? "passed" : "failed",
    checks,
  };
}

async function main() {
  const contract = parseContract(process.env.SUBSTACK_CANARY_CONTRACT_JSON);
  const receipt = await runCanary({
    targetUrl: process.env.SUBSTACK_CANARY_URL,
    cookie: process.env.SUBSTACK_TEST_COOKIE,
    contract,
    runId: process.env.SUBSTACK_CANARY_RUN_ID ?? "local",
  });
  const output = resolve("reports/canary/live-api-drift.json");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.status !== "passed") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Canary failed.");
    process.exitCode = 1;
  });
}
