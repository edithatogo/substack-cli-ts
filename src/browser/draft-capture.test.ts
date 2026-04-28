import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import {
  compareDraftCaptureArtifacts,
  reviewDraftCaptureArtifact,
} from "./draft-capture.js";

describe("reviewDraftCaptureArtifact", () => {
  it("summarizes a saved draft capture artifact", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-test-"));
    const file = join(temp, "capture.json");

    await writeFile(
      file,
      JSON.stringify(
        {
          capturedAt: "2026-04-28T00:00:00.000Z",
          publicationUrl: "https://rareinsights.substack.com/",
          pageUrl: "https://rareinsights.substack.com/publish/post",
          requests: [
            {
              url: "https://rareinsights.substack.com/api/v1/drafts",
              method: "POST",
              bodyKind: "json",
              bodyLength: 42,
              bodyKeys: ["body", "title"],
            },
          ],
          responses: [
            {
              url: "https://rareinsights.substack.com/api/v1/drafts",
              status: 200,
              bodyKind: "json",
              bodyLength: 84,
              topLevelKeys: ["id", "slug"],
              id: 123,
              slug: "example-draft",
              draftUrl: "https://rareinsights.substack.com/publish/post/123",
            },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );

    try {
      const review = await reviewDraftCaptureArtifact(file);
      const firstRequest = review.requestEndpoints[0];
      const firstResponse = review.responseEndpoints[0];

      assert.equal(review.requestCount, 1);
      assert.equal(review.responseCount, 1);
      assert.ok(firstRequest);
      assert.ok(firstResponse);
      assert.equal(firstRequest.method, "POST");
      assert.equal(firstResponse.slug, "example-draft");
      assert.equal(
        firstResponse.draftUrl,
        "https://rareinsights.substack.com/publish/post/123",
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("compares two draft capture artifacts by normalized shape", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-test-"));
    const expectedFile = join(temp, "expected.json");
    const actualFile = join(temp, "actual.json");

    const expectedArtifact = {
      capturedAt: "2026-04-28T00:00:00.000Z",
      publicationUrl: "https://rareinsights.substack.com/",
      pageUrl: "https://rareinsights.substack.com/publish/post",
      requests: [
        {
          url: "https://rareinsights.substack.com/api/v1/drafts",
          method: "POST",
          bodyKind: "json",
          bodyLength: 42,
          bodyKeys: ["body", "title"],
        },
      ],
      responses: [
        {
          url: "https://rareinsights.substack.com/api/v1/drafts",
          status: 200,
          bodyKind: "json",
          bodyLength: 84,
          topLevelKeys: ["id", "slug"],
          id: 123,
          slug: "example-draft",
          draftUrl: "https://rareinsights.substack.com/publish/post/123",
        },
      ],
    };

    const actualArtifact = {
      ...expectedArtifact,
      capturedAt: "2026-04-29T00:00:00.000Z",
    };

    try {
      await writeFile(
        expectedFile,
        JSON.stringify(expectedArtifact, null, 2),
        "utf8",
      );
      await writeFile(
        actualFile,
        JSON.stringify(actualArtifact, null, 2),
        "utf8",
      );

      const comparison = await compareDraftCaptureArtifacts(
        expectedFile,
        actualFile,
      );

      assert.equal(comparison.equal, true);
      assert.equal(comparison.differences.length, 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
