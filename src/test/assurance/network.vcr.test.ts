import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  FixtureTransport,
  parseMockTransportFixture,
} from "../../substack-api/fixture-transport.js";

describe("network interaction VCR replay", () => {
  it("replays recorded responses and fails closed for unrecorded routes", async () => {
    const transport = new FixtureTransport(
      parseMockTransportFixture(
        JSON.stringify({
          scenario: "vcr-read-replay",
          generatedAt: "2026-08-08T00:00:00.000Z",
          calls: [
            {
              method: "GET",
              url: "https://example.test/api/me",
              responses: [{ status: 200, body: { id: 7 } }],
            },
          ],
        }),
      ),
    );
    const recorded = await transport.fetch("https://example.test/api/me");
    const unrecorded = await transport.fetch("https://example.test/api/private");
    assert.equal(recorded.status, 200);
    assert.deepEqual(JSON.parse(await recorded.text()), { id: 7 });
    assert.equal(unrecorded.status, 404);
    assert.match(await unrecorded.text(), /no fixture route configured/);
    assert.equal(transport.callCount(), 2);
  });
});
