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

  it("does not reject a successful JSON response merely because Cloudflare served it", () => {
    assert.equal(
      detectUpstreamChallenge({
        status: 200,
        bodyText: JSON.stringify({ potentialHandles: [] }),
        headers: new Headers({ server: "cloudflare", "content-type": "application/json" }),
      }),
      undefined,
    );
  });

  it("classifies a plain forbidden response and ignores ordinary failures", () => {
    assert.equal(
      detectUpstreamChallenge({ status: 403, bodyText: "forbidden" })?.kind,
      "forbidden",
    );
    assert.equal(detectUpstreamChallenge({ status: 401, bodyText: "unauthorized" }), undefined);
  });
});
