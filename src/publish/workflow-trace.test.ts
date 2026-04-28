import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  compareWorkflowTraceArtifacts,
  reviewWorkflowTraceArtifact,
  writeWorkflowTraceFixture,
} from "./workflow-trace.js";

describe("reviewWorkflowTraceArtifact", () => {
  it("summarizes a stored workflow trace artifact", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-trace-"));
    const file = join(temp, "trace.json");

    await writeFile(
      file,
      JSON.stringify(
        {
          status: "publish-review-opened",
          mode: "publish",
          title: "Review Title",
          currentUrl: "https://rareinsights.substack.com/publish/post/123",
          finalUrl: "https://rareinsights.substack.com/publish/post/123",
          finalState: "publish-review-opened",
          transport: {
            requested: "auto",
            selected: "browser",
            fallbackReason:
              "API transport is unavailable, so the browser workflow was selected.",
          },
          browserbaseSessionId: "session-123",
          browserbaseSessionUrl: "https://browserbase.example/session/123",
          browserbaseDebugUrl: "https://browserbase.example/debug/123",
          trace: [
            {
              name: "open-publish-settings",
              status: "ok",
              startedAt: "2026-04-28T00:00:00.000Z",
              endedAt: "2026-04-28T00:00:01.000Z",
              details: { observedActions: 1 },
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      const review = await reviewWorkflowTraceArtifact(file);

      assert.equal(review.status, "publish-review-opened");
      assert.equal(review.mode, "publish");
      assert.equal(review.traceCount, 1);
      assert.deepEqual(review.stepNames, ["open-publish-settings"]);
      assert.equal(review.browserSessionPresent, true);
      assert.match(review.note, /without exposing session URLs/i);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("compares two stored workflow trace artifacts", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-trace-"));
    const expectedFile = join(temp, "expected.json");
    const actualFile = join(temp, "actual.json");

    await writeFile(
      expectedFile,
      JSON.stringify(
        {
          status: "publish-review-opened",
          mode: "publish",
          title: "Expected Title",
          currentUrl: "https://rareinsights.substack.com/publish/post/123",
          finalUrl: "https://rareinsights.substack.com/publish/post/123",
          finalState: "publish-review-opened",
          transport: {
            requested: "auto",
            selected: "browser",
          },
          trace: [],
        },
        null,
        2,
      ),
      "utf8",
    );

    await writeFile(
      actualFile,
      JSON.stringify(
        {
          status: "publish-clicked",
          mode: "publish",
          title: "Actual Title",
          currentUrl: "https://rareinsights.substack.com/publish/post/456",
          finalUrl: "https://rareinsights.substack.com/publish/post/456",
          finalState: "publish-clicked",
          transport: {
            requested: "browser",
            selected: "browser",
          },
          trace: [
            {
              name: "click-final-publish",
              status: "ok",
              startedAt: "2026-04-28T00:00:00.000Z",
              endedAt: "2026-04-28T00:00:01.000Z",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      const comparison = await compareWorkflowTraceArtifacts(
        expectedFile,
        actualFile,
      );

      assert.equal(comparison.equal, false);
      assert.ok(
        comparison.differences.some((difference) =>
          difference.startsWith("status:"),
        ),
      );
      assert.ok(
        comparison.differences.some((difference) =>
          difference.startsWith("title:"),
        ),
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("writes and rereads a normalized workflow trace fixture", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-trace-"));
    const sourceFile = join(temp, "source.json");
    const fixtureFile = join(temp, "fixture.json");

    await writeFile(
      sourceFile,
      JSON.stringify(
        {
          status: "publish-review-opened",
          mode: "publish",
          title: "Fixture Title",
          currentUrl: "https://rareinsights.substack.com/publish/post/123",
          finalUrl: "https://rareinsights.substack.com/publish/post/123",
          finalState: "publish-review-opened",
          transport: {
            requested: "auto",
            selected: "browser",
          },
          browserbaseSessionId: "session-123",
          browserbaseSessionUrl: "https://browserbase.example/session/123",
          browserbaseDebugUrl: "https://browserbase.example/debug/123",
          trace: [],
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      const fixture = await writeWorkflowTraceFixture(sourceFile, fixtureFile);
      const reread = await reviewWorkflowTraceArtifact(fixtureFile);

      assert.equal(fixture.title, "Fixture Title");
      assert.equal(reread.finalState, "publish-review-opened");
      assert.equal(reread.browserSessionPresent, true);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
