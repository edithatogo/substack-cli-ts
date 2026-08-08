import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { detectUpstreamChallenge } from "./resilience.js";

describe("upstream challenge detection", () => {
  it("detects Cloudflare fingerprints without retaining page content", () => {
    const challenge = detectUpstreamChallenge({
      status: 200,
      bodyText: "<title>Just a moment...</title><script src='/cdn-cgi/challenge-platform/x'>",
    });

    assert.equal(challenge?.kind, "cloudflare");
    assert.doesNotMatch(JSON.stringify(challenge), /<title>/);
    assert.match(challenge?.action ?? "", /auth refresh-state/);
  });

  it("classifies a plain forbidden response and ignores ordinary failures", () => {
    assert.equal(
      detectUpstreamChallenge({ status: 403, bodyText: "forbidden" })?.kind,
      "forbidden",
    );
    assert.equal(detectUpstreamChallenge({ status: 401, bodyText: "unauthorized" }), undefined);
  });
});
