import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseContract, runCanary, validateTarget } from "./substack-live-canary.mjs";

const contract = parseContract(
  JSON.stringify({
    html: { requiredMarkers: ["stable-shell"], forbiddenMarkers: ["challenge-page"] },
    json: [{ path: "/api/v1/publication", requiredPaths: [{ path: "id", type: "number" }] }],
  }),
);

describe("Substack live drift canary", () => {
  it("passes stable read-only HTML and JSON contracts", async () => {
    const requests = [];
    const fetchFn = async (url, options) => {
      requests.push({ url: String(url), options });
      if (String(url).includes("/api/"))
        return new Response(JSON.stringify({ id: 42 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      return new Response("<html>stable-shell</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    };
    const receipt = await runCanary({
      fetchFn,
      targetUrl: "https://canary.substack.com",
      cookie: "substack.sid=test-only",
      contract,
      runId: "test-1",
    });
    assert.equal(receipt.status, "passed");
    assert.equal(requests[0].options.headers.cookie, undefined);
    assert.equal(requests[1].options.headers.cookie, "substack.sid=test-only");
    assert.equal(requests.every(({ options }) => options.method === undefined), true);
  });

  it("reports structural drift without retaining response bodies or cookies", async () => {
    const fetchFn = async (url) =>
      String(url).includes("/api/")
        ? new Response(JSON.stringify({ id: "changed", secret: "do-not-record" }), {
            headers: { "content-type": "application/json" },
          })
        : new Response("<html>changed</html>", { headers: { "content-type": "text/html" } });
    const receipt = await runCanary({
      fetchFn,
      targetUrl: "https://canary.substack.com",
      cookie: "substack.sid=do-not-record",
      contract,
    });
    assert.equal(receipt.status, "failed");
    const serialized = JSON.stringify(receipt);
    assert.doesNotMatch(serialized, /do-not-record/);
    assert.match(serialized, /Required HTML marker is absent/);
    assert.match(serialized, /expected number, received string/);
  });

  it("rejects non-Substack targets and cross-origin probe paths", () => {
    assert.throws(() => validateTarget("http://canary.substack.com"), /HTTPS/);
    assert.throws(() => validateTarget("https://attacker.example"), /substack.com/);
    assert.throws(
      () =>
        parseContract(
          JSON.stringify({
            html: { requiredMarkers: ["x"] },
            json: [{ path: "//attacker.example", requiredPaths: [{ path: "id", type: "number" }] }],
          }),
        ),
      /same-origin/,
    );
  });
});
