import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { CampaignPlanContractSchema } from "../../contracts/schemas.js";
import { parseMarkdownString } from "../../parser/markdown.js";

describe("parser to contract integration", () => {
  it("moves parsed metadata into a valid campaign artifact", async () => {
    const parsed = await parseMarkdownString(
      "---\ntitle: Integration post\nslug: integration-post\n---\n# Body",
      "integration.md",
    );
    const artifact = CampaignPlanContractSchema.parse({
      schemaVersion: 1,
      status: "ready",
      campaignId: "integration",
      createdAt: "2026-08-08T00:00:00.000Z",
      post: {
        filePath: parsed.filePath,
        title: parsed.metadata.title,
        slug: parsed.metadata.slug,
      },
      notes: [],
      channels: [],
      assets: [],
      utm: { source: "substack", medium: "post", campaign: "integration" },
      issues: [],
      nextCommands: ["substack-publisher inspect integration.md"],
    });

    assert.equal(artifact.post.title, "Integration post");
    assert.equal(parsed.document.type, "doc");
  });
});
