import { context, metrics, SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";

export const OBSERVABILITY_SCOPES = [
  "cli",
  "mcp",
  "simulator",
  "parser",
  "state",
  "release",
] as const;

export type ObservabilityScope = (typeof OBSERVABILITY_SCOPES)[number];

const ATTRIBUTE_ALLOWLIST = new Set(["operation", "outcome", "format", "mode", "component"]);
const meter = metrics.getMeter("substack-publisher", "1");
const tracer = trace.getTracer("substack-publisher", "1");
const operationCounter = meter.createCounter("substack.operation.count");
const durationHistogram = meter.createHistogram("substack.operation.duration", { unit: "ms" });

export interface TelemetryStatus {
  exportMode: "none" | "host-provider";
  scopes: readonly ObservabilityScope[];
  note: string;
}

export function telemetryStatus(): TelemetryStatus {
  return {
    exportMode:
      process.env.SUBSTACK_TELEMETRY_EXPORT === "host-provider" ? "host-provider" : "none",
    scopes: OBSERVABILITY_SCOPES,
    note: "OpenTelemetry API providers are no-op by default. Export requires explicit host-provider registration and SUBSTACK_TELEMETRY_EXPORT=host-provider.",
  };
}

export function safeTelemetryAttributes(input: Record<string, unknown> = {}): Attributes {
  const attributes: Attributes = {};
  for (const [key, value] of Object.entries(input)) {
    if (!ATTRIBUTE_ALLOWLIST.has(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value))
      attributes[key] = value as string | number | boolean;
  }
  return attributes;
}

export async function observeOperation<T>(
  scope: ObservabilityScope,
  operation: string,
  callback: () => Promise<T> | T,
  inputAttributes: Record<string, unknown> = {},
): Promise<T> {
  if (!OBSERVABILITY_SCOPES.includes(scope))
    throw new Error(`Unsupported telemetry scope: ${scope}.`);
  if (!/^[a-z][a-z0-9_.-]{1,63}$/.test(operation))
    throw new Error("Telemetry operation name is invalid.");
  const name = `${scope}.${operation}`;
  const attributes = safeTelemetryAttributes({ ...inputAttributes, operation });
  const span = tracer.startSpan(name, { attributes });
  const started = performance.now();
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await callback();
      span.setStatus({ code: SpanStatusCode.OK });
      operationCounter.add(1, { ...attributes, outcome: "success" });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      operationCounter.add(1, { ...attributes, outcome: "error" });
      throw error;
    } finally {
      durationHistogram.record(performance.now() - started, attributes);
      span.end();
    }
  });
}
