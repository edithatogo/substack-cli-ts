import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import type { ProseMirrorNode } from "../types.js";
import { uploadDraftMedia } from "./media-upload.js";

const dummyFetch: typeof fetch = async () => new Response(null, { status: 200 });

function makeDoc(images: Array<{ src: string; alt?: string }>): ProseMirrorNode {
  return {
    type: "doc",
    content: images.map((img) => ({
      type: "image",
      attrs: { src: img.src, alt: img.alt ?? null, title: null, caption: null },
    })),
  };
}

describe("uploadDraftMedia", () => {
  it("skips upload when no local images are present", async () => {
    const doc = makeDoc([{ src: "https://example.com/img.png" }]);

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 0);
    assert.equal(result.report.skipped, 0);
    assert.equal(result.report.assets.length, 0);
    assert.equal(result.document, doc);
  });

  it("fails with unsupported format error for non-image extensions", async () => {
    const doc = makeDoc([{ src: "./image.pdf" }]);

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 1);
    assert.equal(result.report.assets.length, 1);
    assert.match(result.report.assets[0]!.result.error ?? "", /Unsupported image format.*\.pdf/);
  });

  it("fails with file not found for missing local images", async () => {
    const doc = makeDoc([{ src: "/nonexistent-dir/missing-image.png" }]);

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 1);
    assert.equal(result.report.assets.length, 1);
    assert.match(result.report.assets[0]!.result.error ?? "", /File not found/);
  });

  it("returns no-op for empty document with no image nodes", async () => {
    const doc: ProseMirrorNode = { type: "doc", content: [] };

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 0);
    assert.equal(result.report.skipped, 0);
    assert.equal(result.report.assets.length, 0);
    assert.equal(result.document, doc);
  });

  it("skips all images when document contains only remote URLs", async () => {
    const doc = makeDoc([
      { src: "https://example.com/img1.png" },
      { src: "https://cdn.example.com/photo.jpg" },
      { src: "https://media.example.com/hero.webp" },
    ]);

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 0);
    assert.equal(result.report.assets.length, 0);
    assert.equal(result.document, doc);
  });

  it("uploads local images and skips remote ones in a mixed document", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-media-"));
    try {
      const localImage = join(temp, "mixing.png");
      await writeFile(localImage, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

      const doc = makeDoc([{ src: localImage }, { src: "https://example.com/remote-banner.jpg" }]);

      const fetchSpy = async (url: string) => {
        assert.ok(url.includes("/api/v1/image"));
        return {
          status: 200,
          text: async () => JSON.stringify({ url: "https://substack.com/hosted/mixing.png" }),
        };
      };

      const result = await uploadDraftMedia(
        join(temp, "test.md"),
        doc,
        "https://test.substack.com",
        {},
        fetchSpy,
      );

      assert.equal(result.report.uploaded, 1);
      assert.equal(result.report.failed, 0);
      assert.equal(result.report.skipped, 0);
      assert.equal(result.report.assets.length, 1);
      assert.equal(result.report.assets[0]!.asset.kind, "local");

      const firstSrc = result.document.content?.[0]?.attrs?.src;
      assert.equal(firstSrc, "https://substack.com/hosted/mixing.png");

      const secondSrc = result.document.content?.[1]?.attrs?.src;
      assert.equal(secondSrc, "https://example.com/remote-banner.jpg");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  it("skips data URI images without attempting upload", async () => {
    const doc = makeDoc([
      {
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      },
    ]);

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 0);
    assert.equal(result.report.assets.length, 0);
    assert.equal(result.document, doc);
  });

  it("fails with clear error for unresolvable relative path", async () => {
    const doc = makeDoc([{ src: "./nonexistent-subdir/missing.png" }]);

    const result = await uploadDraftMedia(
      "/tmp/test.md",
      doc,
      "https://test.substack.com",
      {},
      dummyFetch,
    );

    assert.equal(result.report.uploaded, 0);
    assert.equal(result.report.failed, 1);
    assert.equal(result.report.assets.length, 1);
    assert.equal(result.report.assets[0]!.asset.kind, "local");
    assert.match(result.report.assets[0]!.result.error ?? "", /File not found/);
  });

  it("attempts upload for a valid local image file", async () => {
    const temp = await mkdtemp(join(tmpdir(), "substack-cli-media-"));
    try {
      const imagePath = join(temp, "test.png");
      await writeFile(imagePath, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));

      const doc = makeDoc([{ src: imagePath }]);

      let _capturedBody: unknown;
      const fetchSpy = async (url: string, init?: Record<string, unknown>) => {
        _capturedBody = init?.body;
        assert.ok(url.includes("/api/v1/image"));
        return {
          status: 200,
          text: async () => JSON.stringify({ url: "https://substack.com/hosted/img.png" }),
        };
      };

      const result = await uploadDraftMedia(
        join(temp, "test.md"),
        doc,
        "https://test.substack.com",
        {},
        fetchSpy,
      );

      assert.equal(result.report.uploaded, 1);
      assert.equal(result.report.failed, 0);

      const updatedSrc = result.document.content?.[0]?.attrs?.src;
      assert.equal(updatedSrc, "https://substack.com/hosted/img.png");
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
