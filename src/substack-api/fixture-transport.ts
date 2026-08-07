import { readFile } from "node:fs/promises";

type HttpMethod = string;

export interface MockTransportFixtureResponse {
  status: number;
  body?: string | number | boolean | null | object | unknown[] | undefined;
  headers?: Record<string, string> | undefined;
  delayMs?: number | undefined;
  error?: string | undefined;
}

export interface MockTransportFixtureCall {
  method: HttpMethod;
  url: string;
  responses: MockTransportFixtureResponse[];
}

export interface MockTransportFixture {
  scenario: string;
  generatedAt: string;
  calls: MockTransportFixtureCall[];
  notes?: string[] | undefined;
}

export interface MockTransportInvocation {
  method: string;
  url: string;
  body: string | undefined;
  routeKey: string;
  responseStatus: number;
  responseIndex: number;
  callIndex: number;
}

export interface MockTransportOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export type MockTransportFetch = (
  input: string,
  init?: { method?: string; body?: unknown },
) => Promise<{ status: number; text: () => Promise<string>; headers: { get(name: string): string | null } }>;

interface MutableFixtureCall {
  responses: MockTransportFixtureResponse[];
  responseCursor: number;
}

const DEFAULT_NOW = () => Date.now();

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

function routeKey(method: string, url: string): string {
  return `${method.toUpperCase()} ${url}`;
}

function normalizeFixture(fixture: unknown): MockTransportFixture {
  if (!fixture || typeof fixture !== "object") {
    throw new Error("Transport fixture must be an object.");
  }

  const candidate = fixture as Record<string, unknown>;

  if (typeof candidate.scenario !== "string" || candidate.scenario.length === 0) {
    throw new Error("Transport fixture requires a non-empty scenario.");
  }

  if (typeof candidate.generatedAt !== "string" || candidate.generatedAt.length === 0) {
    throw new Error("Transport fixture requires a non-empty generatedAt value.");
  }

  if (!Array.isArray(candidate.calls) || candidate.calls.length === 0) {
    throw new Error("Transport fixture requires at least one route call fixture.");
  }

  const calls = candidate.calls.map((call): MockTransportFixtureCall => {
    if (!call || typeof call !== "object") {
      throw new Error("Each fixture call must be an object.");
    }

    const entry = call as Record<string, unknown>;

    if (typeof entry.method !== "string" || entry.method.length === 0) {
      throw new Error("Each fixture call requires a method string.");
    }

    if (typeof entry.url !== "string" || entry.url.length === 0) {
      throw new Error("Each fixture call requires a non-empty URL.");
    }

    if (!Array.isArray(entry.responses) || entry.responses.length === 0) {
      throw new Error(`Fixture call ${entry.method} ${entry.url} requires responses.`);
    }

    const responses = entry.responses.map((response: unknown) => {
      if (!response || typeof response !== "object") {
        throw new Error(`Response entry for ${entry.method} ${entry.url} must be an object.`);
      }

      const candidateResponse = response as Record<string, unknown>;
      if (typeof candidateResponse.status !== "number" || !Number.isFinite(candidateResponse.status)) {
        throw new Error(`Response status for ${entry.method} ${entry.url} must be numeric.`);
      }

      return {
        status: candidateResponse.status,
        body: normalizeResponseBody(candidateResponse.body),
        headers: normalizeHeaders(candidateResponse.headers),
        delayMs:
          typeof candidateResponse.delayMs === "number" && Number.isFinite(candidateResponse.delayMs)
            ? candidateResponse.delayMs
            : undefined,
        error: typeof candidateResponse.error === "string" ? candidateResponse.error : undefined,
      };
    });

    return {
      method: entry.method,
      url: entry.url,
      responses,
    };
  });

  return {
    scenario: candidate.scenario,
    generatedAt: candidate.generatedAt,
    calls,
    notes: Array.isArray(candidate.notes) ? candidate.notes.map((note) => String(note)) : undefined,
  };
}

function normalizeHeaders(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = raw as Record<string, unknown>;

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (typeof value === "string" && key.length > 0) {
      normalized[key] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function serializeBody(value: MockTransportFixtureResponse["body"]): string {
  if (typeof value === "undefined") return "";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeResponseBody(
  raw: unknown,
): MockTransportFixtureResponse["body"] {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") return raw;
  if (typeof raw === "object") return raw;
  return undefined;
}

function createHeaders(raw: Record<string, string> = {}): { get(name: string): string | null } {
  const map = new Map<string, string>();

  for (const [key, value] of Object.entries(raw)) {
    map.set(key.toLowerCase(), value);
  }

  return {
    get(name: string): string | null {
      return map.get(name.toLowerCase()) ?? null;
    },
  };
}

function fallbackResponse(url: string): {
  status: number;
  body: string;
  headers: { get(name: string): string | null };
} {
  const payload = {
    error: "no fixture route configured",
    requestUrl: url,
  };

  return {
    status: 404,
    body: JSON.stringify(payload),
    headers: createHeaders(),
  };
}

export class FixtureTransport {
  private readonly routes = new Map<string, MutableFixtureCall>();
  private readonly invocations: MockTransportInvocation[] = [];
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    fixture: MockTransportFixture,
    options: MockTransportOptions = {},
  ) {
    this.now = options.now ?? DEFAULT_NOW;
    this.sleep = options.sleep ?? defaultSleep;

    for (const call of fixture.calls) {
      this.routes.set(routeKey(call.method, call.url), {
        responses: [...call.responses],
        responseCursor: 0,
      });
    }
  }

  async fetch(
    input: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<{ status: number; text: () => Promise<string>; headers: { get(name: string): string | null } }> {
    const method = (init.method ?? "GET").toUpperCase();
    const route = this.routes.get(routeKey(method, input));

    const invocation: MockTransportInvocation = {
      method,
      url: input,
      body: typeof init.body === "string" ? init.body : undefined,
      routeKey: routeKey(method, input),
      responseStatus: 404,
      responseIndex: -1,
      callIndex: this.invocations.length,
    };

    if (!route || route.responseCursor >= route.responses.length) {
      const response = fallbackResponse(input);
      this.invocations.push(invocation);
      return {
        status: response.status,
        text: () => Promise.resolve(response.body),
        headers: response.headers,
      };
    }

    const responseTemplate = route.responses[route.responseCursor++];
    if (!responseTemplate) {
      const response = fallbackResponse(input);
      this.invocations.push(invocation);
      return {
        status: response.status,
        text: () => Promise.resolve(response.body),
        headers: response.headers,
      };
    }
    invocation.responseStatus = responseTemplate.status;
    invocation.responseIndex = route.responseCursor - 1;

    if (responseTemplate.delayMs && responseTemplate.delayMs > 0) {
      await this.sleep(responseTemplate.delayMs);
    }

    this.invocations.push(invocation);

    if (responseTemplate.error) {
      throw new Error(responseTemplate.error);
    }

    return {
      status: responseTemplate.status,
      text: () => Promise.resolve(serializeBody(responseTemplate.body)),
      headers: createHeaders(responseTemplate.headers),
    };
  }

  allCalls(): MockTransportInvocation[] {
    return [...this.invocations];
  }

  mutationCalls(): MockTransportInvocation[] {
    return this.invocations.filter(
      (call) =>
        call.method === "POST" ||
        call.method === "PUT" ||
        call.method === "PATCH" ||
        call.method === "DELETE",
    );
  }

  callCount(): number {
    return this.invocations.length;
  }

  lastNow(): number {
    return this.now();
  }
}

export async function loadMockTransportFixture(file: string): Promise<MockTransportFixture> {
  const raw = await readFile(file, "utf8");
  return parseMockTransportFixture(raw);
}

export function parseMockTransportFixture(raw: string): MockTransportFixture {
  const parsed = JSON.parse(raw) as unknown;
  return normalizeFixture(parsed);
}
