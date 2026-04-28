import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { reviewWorkflowTraceArtifact } from "./workflow-trace.js";

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
});
