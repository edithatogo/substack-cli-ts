import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  buildCaptureFixtureValidationOutput,
  buildCaptureGraduationOutput,
  buildEndpointDiffOutput,
  buildEndpointInventoryOutput,
  loadEndpointInventoryReport,
  renderEndpointInventoryReport,
} from "./cli.js";
import {
  buildCaptureValidationReport,
  buildEndpointDiffReport,
  buildEndpointInventoryReport,
  buildGraduationCheckReport,
  minimizeCaptureFixture,
  parseCaptureEvidenceFixture,
  renderEndpointInventory,
  type CaptureEvidenceFixture,
} from "./evidence-capture.js";
import type { CoverageMatrix } from "./schema.js";

describe("capture evidence fixtures", () => {
  it("redacts and minimizes sensitive endpoint capture data", () => {
    const minimized = minimizeCaptureFixture(fixture(), {
      verifiedAt: new Date("2026-06-24T00:00:00.000Z"),
    });
    const serialized = JSON.stringify(minimized);

    assert.equal(minimized.capabilityId, "analytics-growth-revenue");
    assert.equal(minimized.lastVerifiedAt, "2026-06-24T00:00:00.000Z");
    assert.equal(minimized.endpoints[0]?.requestHeaders?.authorization, "[REDACTED]");
    assert.equal(minimized.endpoints[0]?.requestBody, undefined);
    assert.match(minimized.evidenceHash, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(serialized, /owner@example.com/);
    assert.doesNotMatch(serialized, /Jane Creator/);
    assert.doesNotMatch(serialized, /synthetic-secret-token/);
    assert.doesNotMatch(serialized, /123456789/);
  });

  it("validates parse shape and blocked minimized captures", () => {
    const parsed = parseCaptureEvidenceFixture(fixture());
    const report = buildCaptureValidationReport(
      {
        ...parsed,
        endpoints: [{ method: "GET", url: "https://example.substack.com/api/v1/stats" }],
      },
      { verifiedAt: new Date("2026-06-24T00:00:00.000Z") },
    );

    assert.equal(parsed.source, "browser");
    assert.equal(report.status, "blocked");
    assert.equal(report.issues[0]?.code, "empty-evidence");
    assert.throws(() => parseCaptureEvidenceFixture({}));
    assert.throws(
      () => parseCaptureEvidenceFixture({ ...fixture(), endpoints: [null] }),
      /endpoint 0/,
    );
    assert.throws(
      () =>
        parseCaptureEvidenceFixture({ ...fixture(), endpoints: [{ url: "https://example.com" }] }),
      /method/,
    );
    assert.throws(
      () => parseCaptureEvidenceFixture({ ...fixture(), endpoints: [{ method: "GET" }] }),
      /url/,
    );
  });

  it("rejects malformed capture fixtures with specific shape errors", () => {
    assert.throws(() => parseCaptureEvidenceFixture(null), /must be an object/);
    assert.throws(
      () =>
        parseCaptureEvidenceFixture({
          ...fixture(),
          capabilityId: "",
        }),
      /capabilityId/,
    );
    assert.throws(
      () =>
        parseCaptureEvidenceFixture({
          schemaVersion: 2,
          capabilityId: "x",
          capturedAt: "2026-06-24T00:00:00.000Z",
          source: "browser",
          surface: "Surface",
          endpoints: [],
        }),
      /schemaVersion/,
    );
    assert.throws(
      () =>
        parseCaptureEvidenceFixture({
          schemaVersion: 1,
          capabilityId: "x",
          capturedAt: "not-a-date",
          source: "browser",
          surface: "Surface",
          endpoints: [],
        }),
      /capturedAt/,
    );
    assert.throws(
      () =>
        parseCaptureEvidenceFixture({
          schemaVersion: 1,
          capabilityId: "x",
          capturedAt: "2026-06-24T00:00:00.000Z",
          source: "cli",
          surface: "Surface",
          endpoints: [],
        }),
      /source/,
    );
    assert.throws(
      () =>
        parseCaptureEvidenceFixture({
          schemaVersion: 1,
          capabilityId: "x",
          capturedAt: "2026-06-24T00:00:00.000Z",
          source: "browser",
          surface: "",
          endpoints: [],
        }),
      /surface/,
    );
  });

  it("handles header allowlists, invalid URLs, truncation, and residual sensitive values", () => {
    const minimized = minimizeCaptureFixture(
      fixture({
        url: "not a url with owner@example.com and 123456789012",
        requestHeaders: {
          accept: "application/json",
          "x-substack-version": "2026.06",
          cookie: "secret",
          "x-custom": "drop",
        },
        responseBody: "safe body ".repeat(260),
      }),
      { verifiedAt: new Date("2026-06-24T00:00:00.000Z") },
    );

    assert.equal(minimized.endpoints[0]?.requestHeaders?.accept, "application/json");
    assert.equal(minimized.endpoints[0]?.requestHeaders?.cookie, "[REDACTED]");
    assert.equal(minimized.endpoints[0]?.requestHeaders?.["x-custom"], undefined);
    assert.doesNotMatch(minimized.endpoints[0]?.url ?? "", /owner@example.com/);
    assert.deepEqual(
      minimized.endpoints[0]?.responseBody,
      assertTruncatedPreview(minimized.endpoints[0]?.responseBody),
    );

    const cleaned = buildCaptureValidationReport(
      fixture({
        responseBody: { leaked: "Bearer synthetic-secret-token-with-enough-length" },
      }),
    );
    assert.equal(cleaned.status, "ready");
    assert.doesNotMatch(JSON.stringify(cleaned.minimized), /synthetic-secret-token/);

    const numeric = minimizeCaptureFixture(
      fixture({
        responseBody: {
          subscriber_count: 10,
          safe_count: 20,
          nested: { value: 1 },
        },
      }),
    );
    assert.equal(
      (numeric.endpoints[0]?.responseBody as Record<string, unknown>).subscriber_count,
      "[REDACTED]",
    );
    assert.equal((numeric.endpoints[0]?.responseBody as Record<string, unknown>).safe_count, 20);
  });

  it("handles non-JSON body values without crashing minimization", () => {
    const minimized = minimizeCaptureFixture(
      fixture({
        responseBody: Symbol("ignored"),
      }),
    );

    assert.equal(typeof minimized.evidenceHash, "string");
    assert.equal(minimized.endpoints[0]?.responseBody, undefined);
  });

  it("keeps sensitive-value validation deterministic across repeated global regex checks", () => {
    const first = buildCaptureValidationReport(
      fixture({ responseBody: { leaked: "owner@example.com" } }),
      { verifiedAt: new Date("2026-06-24T00:00:00.000Z") },
    );
    const second = buildCaptureValidationReport(
      fixture({ responseBody: { leaked: "owner@example.com" } }),
      { verifiedAt: new Date("2026-06-24T00:00:00.000Z") },
    );

    assert.equal(first.status, "ready");
    assert.equal(second.status, "ready");
    assert.doesNotMatch(JSON.stringify(second.minimized), /owner@example.com/);
  });
});

function assertTruncatedPreview(value: unknown): unknown {
  assert.ok(value && typeof value === "object");
  assert.equal((value as { truncated?: unknown }).truncated, true);
  assert.equal(typeof (value as { preview?: unknown }).preview, "string");
  return value;
}

describe("endpoint inventory and diff reports", () => {
  it("renders a stable endpoint inventory", () => {
    const report = buildEndpointInventoryReport([fixture()], {
      generatedAt: new Date("2026-06-24T01:00:00.000Z"),
    });
    const markdown = renderEndpointInventory(report);

    assert.equal(report.operation, "coverage.endpoint.inventory");
    assert.equal(report.status, "ready");
    assert.equal(report.endpointCount, 1);
    assert.equal(report.entries[0]?.path, "/api/v1/stats");
    assert.match(markdown, /Endpoint Capture Inventory/);
    assert.match(markdown, /analytics-growth-revenue/);
  });

  it("reports added, removed, and changed endpoints", () => {
    const before = buildEndpointInventoryReport([fixture()], {
      generatedAt: new Date("2026-06-24T01:00:00.000Z"),
    });
    const after = buildEndpointInventoryReport(
      [
        fixture({
          status: 206,
          responseBody: { metrics: ["opens"], email: "owner@example.com" },
        }),
        fixture({
          method: "POST",
          url: "https://example.substack.com/api/v1/reports",
          responseBody: { ok: true },
        }),
      ],
      { generatedAt: new Date("2026-06-24T02:00:00.000Z") },
    );

    const diff = buildEndpointDiffReport(before, after);

    assert.equal(diff.status, "blocked");
    assert.equal(diff.added.length, 1);
    assert.equal(diff.removed.length, 0);
    assert.ok(diff.changed.some((entry) => entry.changes.includes("status")));
  });

  it("reports removed endpoints and loads inventory artifacts through CLI helpers", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-capture-cli-"));
    try {
      const fixturePath = join(temp, "capture.json");
      const beforePath = join(temp, "before.json");
      const afterPath = join(temp, "after.json");
      const inventoryPath = join(temp, "inventory.json");
      await writeFile(fixturePath, JSON.stringify(fixture(), null, 2));

      const validation = await buildCaptureFixtureValidationOutput(fixturePath);
      assert.equal(validation.status, "ready");

      const before = buildEndpointInventoryReport([
        fixture(),
        fixture({ method: "POST", url: "https://example.substack.com/api/v1/reports" }),
      ]);
      const after = buildEndpointInventoryReport([fixture()]);
      await writeFile(beforePath, JSON.stringify(before, null, 2));
      await writeFile(afterPath, JSON.stringify(after, null, 2));
      await writeFile(
        inventoryPath,
        JSON.stringify(await buildEndpointInventoryOutput([fixturePath])),
      );

      const diff = await buildEndpointDiffOutput(beforePath, afterPath);
      const loaded = await loadEndpointInventoryReport(inventoryPath);

      assert.equal(diff.status, "blocked");
      assert.equal(diff.removed.length, 1);
      assert.equal(loaded.endpointCount, 1);
      assert.match(renderEndpointInventoryReport(loaded, "json"), /coverage.endpoint.inventory/);
      assert.match(renderEndpointInventoryReport(loaded, "markdown"), /Endpoint Capture Inventory/);
      await writeFile(join(temp, "bad-inventory.json"), "{}");
      await assert.rejects(
        () => loadEndpointInventoryReport(join(temp, "bad-inventory.json")),
        /capture-inventory/,
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

describe("graduation checks", () => {
  it("blocks probe, planning, and manual surfaces without capture and manual evidence", () => {
    const report = buildGraduationCheckReport(matrix(), buildEndpointInventoryReport([fixture()]), {
      checkedAt: new Date("2026-06-24T00:00:00.000Z"),
    });

    assert.equal(report.status, "blocked");
    assert.deepEqual(report.blockers[0]?.missing, [
      "manual validation or recovery evidence",
      "endpoint-capture evidence link",
    ]);
    assert.deepEqual(report.blockers[1]?.missing, [
      "redacted endpoint capture fixture",
      "manual validation or recovery evidence",
      "endpoint-capture evidence link",
    ]);
  });

  it("passes when every conservative surface has capture, manual evidence, and decisions", () => {
    const matrixWithEvidence = matrix({
      evidence: [
        { kind: "endpoint-capture", label: "Capture", ref: "fixtures/captures/analytics.json" },
        { kind: "manual-check", label: "Manual recovery", ref: "docs/frontier-capture-kit.md" },
      ],
    });
    const report = buildGraduationCheckReport(
      matrixWithEvidence,
      buildEndpointInventoryReport([fixture(), fixture({ capabilityId: "native-video-posts" })]),
    );

    assert.equal(report.status, "ready");
    assert.equal(report.blockers.length, 0);
  });

  it("runs graduation checks through file-backed CLI helpers", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-capture-graduation-"));
    try {
      const matrixPath = join(temp, "matrix.json");
      const inventoryPath = join(temp, "inventory.json");
      await writeFile(matrixPath, JSON.stringify(matrix({ evidence: [] }), null, 2));
      await writeFile(
        inventoryPath,
        JSON.stringify(buildEndpointInventoryReport([fixture()]), null, 2),
      );

      const report = await buildCaptureGraduationOutput(matrixPath, inventoryPath);
      assert.equal(report.status, "blocked");
      assert.ok(report.blockers.length > 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

function fixture(
  overrides: Partial<CaptureEvidenceFixture["endpoints"][number]> & {
    capabilityId?: string;
  } = {},
): CaptureEvidenceFixture {
  return {
    schemaVersion: 1,
    capabilityId: overrides.capabilityId ?? "analytics-growth-revenue",
    capturedAt: "2026-06-24T00:00:00.000Z",
    source: "browser",
    surface: "Dashboard analytics for Jane Creator",
    endpoints: [
      {
        method: overrides.method ?? "GET",
        url:
          overrides.url ??
          "https://example.substack.com/api/v1/stats?email=owner@example.com&publication_id=123456789",
        status: overrides.status ?? 200,
        requestHeaders: {
          authorization: "Bearer synthetic-secret-token-with-enough-length",
          cookie: "substack.sid=secret",
          accept: "application/json",
        },
        requestBody: overrides.requestBody,
        responseHeaders: { "content-type": "application/json", "set-cookie": "sid=secret" },
        responseBody: overrides.responseBody ?? {
          subscriber_email: "owner@example.com",
          display_name: "Jane Creator",
          publication_id: 123456789,
          metrics: [{ post_id: "123456789", opens: 42 }],
        },
      },
    ],
    notes: ["Captured from account owner@example.com"],
  };
}

function matrix(
  evidenceOverride?: Pick<CoverageMatrix["capabilities"][number], "evidence">,
): CoverageMatrix {
  return {
    schemaVersion: 1,
    capabilities: [
      {
        id: "analytics-growth-revenue",
        name: "Analytics",
        domain: "analytics-revenue",
        status: "probe-only",
        paths: ["cli", "browser", "manual-admin"],
        primaryPath: "cli",
        fallbackPath: "browser",
        manualPath: "manual-admin",
        safetyClass: "read-only",
        evidence: evidenceOverride?.evidence ?? [],
        decisionRecord: { id: "DR-analytics", reason: "Capture first." },
        nextAction: "Capture endpoints.",
      },
      {
        id: "native-video-posts",
        name: "Native video",
        domain: "native-media",
        status: "planning-only",
        paths: ["cli", "mcp-planning", "manual-admin"],
        primaryPath: "cli",
        fallbackPath: "mcp-planning",
        manualPath: "manual-admin",
        safetyClass: "planning-only",
        evidence: evidenceOverride?.evidence ?? [],
        decisionRecord: { id: "DR-video", reason: "Capture first." },
        nextAction: "Capture endpoints.",
      },
    ],
  };
}
