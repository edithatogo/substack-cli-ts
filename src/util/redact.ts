export function redact(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  return "[REDACTED]";
}

export function redactUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname
      .split("/")
      .map((part) => redactSensitivePathSegment(part))
      .join("/")}`;
  } catch {
    return redact(value);
  }
}

const SENSITIVE_KEY =
  /(?:authorization|cookie|credential|password|secret|token|api.?key|session.?id|project.?id|email)/i;
const HIGH_ENTROPY_PATH = /^(?:[0-9a-f]{24,}|[A-Za-z0-9_-]{32,}|[0-9a-f]{8}-[0-9a-f-]{27})$/i;

function redactSensitivePathSegment(value: string): string {
  return HIGH_ENTROPY_PATH.test(value) ? "[REDACTED]" : value;
}

export function sanitizeStructured(value: unknown, key = ""): unknown {
  return sanitizeValue(value, key, new WeakSet<object>());
}

function sanitizeValue(value: unknown, key: string, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "object") {
    if (seen.has(value)) return "[CIRCULAR]";
    seen.add(value);
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, "", seen));
  if (value instanceof Error) {
    return { name: value.name, message: sanitizeText(value.message) };
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return "[REDACTED OBJECT]";
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeValue(entryValue, entryKey, seen),
      ]),
    );
  }
  if (typeof value === "string") {
    if (/(?:url|uri)$/i.test(key)) return redactUrl(value);
    return sanitizeText(value);
  }
  return value;
}

function sanitizeText(value: string): string {
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/\b(password|secret|token|api[_-]?key|cookie)=([^\s,;&]+)/gi, "$1=[REDACTED]");
}
