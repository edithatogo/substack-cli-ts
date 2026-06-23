import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { PreparedPost } from "../types.js";
import {
  buildCampaignExecutionReport,
  buildCampaignPlan,
  buildCampaignRunLogReport,
  type CampaignPlan,
  collectCampaignOption,
  parseCampaignChannels,
  readCampaignPlan,
  validateCampaignPlan,
} from "./campaign.js";

const futurePublish = "2099-01-01T09:00:00Z";
const futureNote = "2099-01-01T10:00:00Z";

describe("campaign planning", () => {
  it("builds a ready campaign plan with UTM channel URLs", () => {
    const plan = buildCampaignPlan(preparedPost(), {
      publicationUrl: "https://example.substack.com",
      publishAt: futurePublish,
      noteAt: [futureNote],
      channels: ["notes", "linkedin"],
      runLogDir: ".substack-cli/run-log",
    });

    assert.equal(plan.status, "ready");
    assert.equal(plan.campaignId, "creator-os");
    assert.equal(plan.post.plannedUrl, "https://example.substack.com/p/creator-os");
    assert.equal(plan.notes[0]?.postUrl, "https://example.substack.com/p/creator-os");
    assert.equal(plan.channels.length, 2);
    assert.match(plan.channels[1]?.trackingUrl ?? "", /utm_source=linkedin/);
    assert.ok(plan.nextCommands.some((command) => command.includes("schedule")));
  });

  it("blocks unsupported channels and colliding note timestamps", () => {
    const plan = buildCampaignPlan(preparedPost(), {
      publicationUrl: "https://example.substack.com",
      publishAt: futurePublish,
      noteAt: [futureNote, futureNote],
      channels: ["notes", "mastodon"],
    });

    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "channel-unsupported"));
    assert.ok(plan.issues.some((issue) => issue.code === "schedule-collision"));
  });

  it("validates serialized plans and execution confirmation", () => {
    const plan = buildCampaignPlan(preparedPost(), {
      publicationUrl: "https://example.substack.com",
      publishAt: futurePublish,
      noteAt: [futureNote],
      channels: parseCampaignChannels("notes,x"),
    });

    assert.equal(validateCampaignPlan(plan).status, "ready");
    assert.equal(buildCampaignExecutionReport(plan, false).status, "blocked");
    assert.equal(buildCampaignExecutionReport(plan, true).status, "ready");
  });

  it("parses channel and repeatable option defaults", () => {
    assert.deepEqual(parseCampaignChannels(undefined), ["notes"]);
    assert.deepEqual(parseCampaignChannels(["notes", "x,youtube"]), ["notes", "x", "youtube"]);
    assert.deepEqual(collectCampaignOption(futureNote, ["2099-01-01T09:30:00Z"]), [
      "2099-01-01T09:30:00Z",
      futureNote,
    ]);
  });

  it("blocks missing planned URLs for scheduled notes", () => {
    const plan = buildCampaignPlan(preparedPost({ slug: undefined }), {
      noteAt: [futureNote],
      channels: ["youtube"],
    });

    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "note-post-url-missing"));
    assert.equal(validateCampaignPlan(plan).status, "blocked");
    assert.ok(plan.nextCommands.some((command) => command.includes("publish")));
  });

  it("blocks invalid publication and canonical URLs without throwing", () => {
    const badPublication = buildCampaignPlan(preparedPost(), {
      publicationUrl: "not a url",
      channels: ["linkedin"],
    });
    const badCanonical = buildCampaignPlan(preparedPost({ canonicalUrl: "not a url" }), {
      channels: ["linkedin"],
    });

    assert.equal(badPublication.status, "blocked");
    assert.ok(badPublication.issues.some((issue) => issue.code === "publication-url-invalid"));
    assert.equal(badCanonical.status, "blocked");
    assert.ok(badCanonical.issues.some((issue) => issue.code === "canonical-url-invalid"));
  });

  it("blocks invalid publish times at build time", () => {
    const plan = buildCampaignPlan(preparedPost(), {
      publishAt: "not-a-date",
    });

    assert.equal(plan.status, "blocked");
    assert.ok(plan.issues.some((issue) => issue.code === "publish-at-invalid"));
  });

  it("uses campaign, asset, command, and UTM fallbacks", () => {
    const slugCampaign = buildCampaignPlan(preparedPost({ campaign: undefined }));
    const safeCampaign = buildCampaignPlan(
      preparedPost(
        { title: "", slug: undefined, campaign: undefined, video: undefined, thumbnail: undefined },
        "",
      ),
      { channels: ["youtube"] },
    );
    const utmAlias = buildCampaignPlan(
      preparedPost({
        campaign: undefined,
        utm: "utm_source=notes&utm_medium=social&utm_campaign=launch",
      }),
      {
        publicationUrl: "https://example.substack.com",
        channels: ["notes"],
      },
    );
    const utmDefault = buildCampaignPlan(preparedPost({ utm: "launch" }), {
      publicationUrl: "https://example.substack.com",
      channels: ["linkedin"],
    });
    const utmMissingCampaign = buildCampaignPlan(
      preparedPost({ campaign: undefined, utm: "source=mail&medium=social" }),
    );
    const publishRunLog = buildCampaignPlan(preparedPost(), { runLogDir: "logs" });

    assert.equal(slugCampaign.campaignId, "creator-os");
    assert.equal(safeCampaign.campaignId, "campaign");
    assert.ok(safeCampaign.issues.some((issue) => issue.code === "title-required"));
    assert.deepEqual(safeCampaign.assets, []);
    assert.equal(utmAlias.utm.source, "notes");
    assert.equal(utmAlias.utm.medium, "social");
    assert.equal(utmAlias.utm.campaign, "launch");
    assert.equal(utmDefault.utm.source, "substack-cli");
    assert.equal(utmDefault.utm.medium, "campaign");
    assert.equal(utmDefault.utm.campaign, "launch");
    assert.equal(utmMissingCampaign.utm.campaign, "creator-os");
    assert.ok(
      publishRunLog.nextCommands.some((command) => command.includes("--run-log-dir 'logs'")),
    );
  });

  it("supports canonical URLs and explicit UTM parameters", () => {
    const plan = buildCampaignPlan(
      preparedPost({
        canonicalUrl: "https://canonical.example/post",
        utm: "source=mail&medium=social&campaign=launch",
        audio: "episode.mp3",
        transcript: "transcript.md",
        socialImage: "share.png",
      }),
      {
        channels: ["linkedin"],
      },
    );

    assert.equal(plan.status, "ready");
    assert.equal(plan.post.plannedUrl, "https://canonical.example/post");
    assert.match(plan.channels[0]?.trackingUrl ?? "", /utm_medium=social/);
    assert.deepEqual(
      plan.assets.map((asset) => asset.kind),
      ["video", "audio", "transcript", "thumbnail", "socialImage"],
    );
  });

  it("reports blocked serialized plans", () => {
    const badPlan = {
      ...buildCampaignPlan(preparedPost(), {
        publicationUrl: "https://example.substack.com",
        publishAt: futurePublish,
      }),
      schemaVersion: 2,
      post: { filePath: "", title: "" },
      channels: [{ channel: "mastodon", plannedAction: "Unsupported channel." }],
      notes: [
        {
          scheduledAt: "2020-01-01T00:00:00Z",
          postUrl: "https://example.substack.com/p/creator-os",
          text: "old",
          status: "planned",
        },
        {
          scheduledAt: "2099-01-01T08:00:00Z",
          postUrl: "https://example.substack.com/p/creator-os",
          text: "early",
          status: "planned",
        },
      ],
    } as unknown as CampaignPlan;

    const validated = validateCampaignPlan(badPlan);
    assert.equal(validated.status, "blocked");
    assert.equal(buildCampaignExecutionReport(validated, true).status, "blocked");
    assert.ok(validated.issues.some((issue) => issue.code === "schema-version"));
    assert.ok(validated.issues.some((issue) => issue.code === "post-file-required"));
    assert.ok(validated.issues.some((issue) => issue.code === "channel-unsupported"));
    assert.ok(validated.issues.some((issue) => issue.code === "note-before-publish"));

    const invalidTimestampPlan = validateCampaignPlan({
      ...badPlan,
      publishAt: "not-a-date",
      notes: [],
    });
    assert.ok(invalidTimestampPlan.issues.some((issue) => issue.code === "publish-at-invalid"));

    const malformedArrays = validateCampaignPlan({
      ...badPlan,
      channels: undefined,
      notes: undefined,
    } as unknown as CampaignPlan);
    assert.ok(malformedArrays.issues.some((issue) => issue.code === "channels-required"));
    assert.ok(malformedArrays.issues.some((issue) => issue.code === "notes-required"));
  });

  it("reads plan files and summarizes campaign run logs", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-campaign-run-log-"));
    const runLogDir = join(temp, "logs");
    const plan = buildCampaignPlan(preparedPost(), {
      publicationUrl: "https://example.substack.com",
      publishAt: futurePublish,
    });

    try {
      await mkdir(runLogDir, { recursive: true });
      const planFile = join(temp, "campaign.json");
      await writeFile(planFile, `${JSON.stringify(plan, null, 2)}\n`);
      assert.equal((await readCampaignPlan(planFile)).status, "ready");
      const brokenPlanFile = join(temp, "broken-campaign.json");
      await writeFile(brokenPlanFile, "{not-json");
      const brokenPlan = await readCampaignPlan(brokenPlanFile);
      assert.equal(brokenPlan.status, "blocked");
      assert.ok(brokenPlan.issues.some((issue) => issue.code === "plan-read-failed"));

      await writeFile(
        join(runLogDir, "valid.json"),
        `${JSON.stringify({
          schemaVersion: 1,
          timestamp: futurePublish,
          actionType: "campaign.plan",
          status: "success",
          publicationUrl: "https://example.substack.com",
          publicationId: null,
        })}\n`,
      );
      await writeFile(join(runLogDir, "invalid.json"), "{not-json");
      const report = await buildCampaignRunLogReport(runLogDir);
      assert.equal(report.artifactCount, 1);
      assert.equal(report.byAction["campaign.plan"], 1);
      assert.equal(report.latest?.actionType, "campaign.plan");

      const emptyRunLogDir = join(temp, "empty-logs");
      await mkdir(emptyRunLogDir);
      const emptyReport = await buildCampaignRunLogReport(emptyRunLogDir);
      assert.equal(emptyReport.artifactCount, 0);
      assert.equal(emptyReport.latest, null);
      assert.match(emptyReport.message, /artifacts/);

      const missingReport = await buildCampaignRunLogReport(join(temp, "missing"));
      assert.equal(missingReport.artifactCount, 0);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("quotes post paths safely in next commands", () => {
    const plan = buildCampaignPlan(preparedPost({}, "posts/creator's os.md"));
    assert.ok(plan.nextCommands.some((command) => command.includes(`'posts/creator'"'"'s os.md'`)));
  });
});

function preparedPost(
  metadata: Partial<PreparedPost["post"]["metadata"]> = {},
  filePath = "posts/creator-os.md",
): PreparedPost {
  return {
    mode: "schedule",
    scheduleAt: futurePublish,
    post: {
      filePath,
      metadata: {
        title: "Creator OS",
        slug: "creator-os",
        tags: ["creator"],
        campaign: "creator-os",
        video: "video.mp4",
        thumbnail: "thumb.png",
        ...metadata,
      },
      markdown: "# Creator OS",
      html: "<h1>Creator OS</h1>",
      document: { type: "doc" },
      media: { assets: [], localCount: 0, remoteCount: 0, dataCount: 0 },
      warnings: [],
    },
  };
}
