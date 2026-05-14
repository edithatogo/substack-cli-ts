import assert from "node:assert/strict";
import { chromium } from "playwright-core";
import { describe, it } from "vitest";

const requiredVars = ["SUBSTACK_EMAIL", "SUBSTACK_PASSWORD", "SUBSTACK_PUBLICATION_URL"] as const;
const liveCredentials = requiredVars.every((v) => process.env[v]);

const e2eDescribe = liveCredentials ? describe : describe.skip;

e2eDescribe("Substack E2E: smoke test", () => {
  it("can launch a browser and visit the configured publication", async () => {
    const publicationUrl = process.env.SUBSTACK_PUBLICATION_URL!;

    assert.ok(publicationUrl.startsWith("https://"), `PUBLICATION_URL: ${publicationUrl}`);

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(publicationUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

      const title = await page.title();
      assert.ok(title.length > 0, "page should have a non-empty title");

      const bodyText = await page.evaluate(() => document.body.innerText);
      assert.ok(bodyText.length > 0, "page body should contain text");
    } finally {
      await browser.close();
    }
  });
});
