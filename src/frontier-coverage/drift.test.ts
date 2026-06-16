import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { buildFrontierDriftReport, parseDriftEvidenceSnapshots } from "./drift.js";
import type { CoverageMatrix } from "./schema.js";

describe("frontier coverage drift", () => {
  it("reports fresh official evidence as ready", () => {
    const report = buildFrontierDriftReport({
      matrix: matrix(),
      snapshots: [
        {
          ref: "https://support.substack.com/video",
          checkedAt: "2026-06-01T00:00:00.000Z",
          status: "ok",
        },
      ],
      now: new Date("2026-06-16T00:00:00.000Z"),
    });

    assert.equal(report.status, "ready");
    assert.equal(report.officialDocs[0]?.status, "fresh");
  });

  it("blocks stale, changed, unavailable, and missing official evidence", () => {
    const report = buildFrontierDriftReport({
      matrix: matrix(),
      snapshots: [
        {
          ref: "https://support.substack.com/video",
          checkedAt: "2026-01-01T00:00:00.000Z",
          status: "ok",
        },
      ],
      now: new Date("2026-06-16T00:00:00.000Z"),
      staleAfterDays: 30,
    });
    const changed = buildFrontierDriftReport({
      matrix: matrix("changed-doc", "https://support.substack.com/changed"),
      snapshots: [
        {
          ref: "https://support.substack.com/changed",
          checkedAt: "2026-06-01T00:00:00.000Z",
          status: "changed",
        },
      ],
      now: new Date("2026-06-16T00:00:00.000Z"),
    });
    const missing = buildFrontierDriftReport({
      matrix: matrix("missing-doc", "https://support.substack.com/missing"),
      snapshots: [],
      now: new Date("2026-06-16T00:00:00.000Z"),
    });
    const unavailable = buildFrontierDriftReport({
      matrix: matrix("unavailable-doc", "https://support.substack.com/unavailable"),
      snapshots: [
        {
          ref: "https://support.substack.com/unavailable",
          checkedAt: "2026-06-01T00:00:00.000Z",
          status: "unavailable",
        },
      ],
      now: new Date("2026-06-16T00:00:00.000Z"),
    });

    assert.equal(report.status, "blocked");
    assert.equal(report.officialDocs[0]?.status, "stale");
    assert.equal(changed.officialDocs[0]?.status, "changed");
    assert.equal(missing.officialDocs[0]?.status, "missing-snapshot");
    assert.equal(unavailable.officialDocs[0]?.status, "unavailable");
  });

  it("parses snapshot fixtures and rejects invalid shapes", () => {
    const parsed = parseDriftEvidenceSnapshots([
      {
        ref: "https://support.substack.com/video",
        checkedAt: "2026-06-01T00:00:00.000Z",
        status: "ok",
        note: "No change.",
      },
    ]);

    assert.equal(parsed[0]?.status, "ok");
    assert.throws(() => parseDriftEvidenceSnapshots({}));
    assert.throws(() => parseDriftEvidenceSnapshots([null]));
    assert.throws(() => parseDriftEvidenceSnapshots([{}]));
    assert.throws(() =>
      parseDriftEvidenceSnapshots([
        { ref: "https://support.substack.com/video", checkedAt: "not-a-date", status: "ok" },
      ]),
    );
    assert.throws(() =>
      parseDriftEvidenceSnapshots([
        {
          ref: "https://support.substack.com/video",
          checkedAt: "2026-06-01T00:00:00.000Z",
          status: "bad",
        },
      ]),
    );
  });

  it("blocks non-implemented capabilities that are missing decision records", () => {
    const report = buildFrontierDriftReport({
      matrix: {
        schemaVersion: 1,
        capabilities: [
          {
            ...matrix().capabilities[0],
            status: "probe-only",
            decisionRecord: undefined,
          },
        ],
      },
      snapshots: [
        {
          ref: "https://support.substack.com/video",
          checkedAt: "2026-06-01T00:00:00.000Z",
          status: "ok",
        },
      ],
      now: new Date("2026-06-16T00:00:00.000Z"),
    });

    assert.equal(report.status, "blocked");
    assert.equal(report.endpointCaptureDiagnostics[0]?.decisionRecordId, "missing-decision-record");
  });
});

function matrix(id = "video-doc", ref = "https://support.substack.com/video"): CoverageMatrix {
  return {
    schemaVersion: 1,
    capabilities: [
      {
        id,
        name: "Video docs",
        domain: "native-media",
        status: "read-only",
        paths: ["cli", "browser", "manual-admin"],
        primaryPath: "cli",
        fallbackPath: "browser",
        manualPath: "manual-admin",
        safetyClass: "read-only",
        evidence: [{ kind: "official-doc", label: "Video docs", ref }],
        nextAction: "Refresh official evidence.",
      },
    ],
  };
}
