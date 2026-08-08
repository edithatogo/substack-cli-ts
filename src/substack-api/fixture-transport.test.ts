import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { requestWrite } from "./client.js";
import {
  FixtureTransport,
  loadMockTransportFixture,
  parseMockTransportFixture,
} from "./fixture-transport.js";

describe("fixture transport", () => {
  it("replays responses in order and records deterministic invocation history", async () => {
    const transport = new FixtureTransport(
      parseMockTransportFixture(`{
  "scenario": "ordered-replies",
  "generatedAt": "2026-08-07T00:00:00.000Z",
  "calls": [
    {
      "method": "POST",
      "url": "https://rareinsights.substack.com/api/v1/drafts",
      "responses": [
        { "status": 429, "body": { "error": "rate limited" } },
        { "status": 503, "body": { "error": "service unavailable" } },
        { "status": 200, "body": { "id": 99, "draft_url": "https://rareinsights.substack.com/p/test" } }
      ]
    }
  ]
}`),
    );

    const responseOne = await transport.fetch("https://rareinsights.substack.com/api/v1/drafts", {
      method: "POST",
      body: '{"title":"Retry me"}',
    });
    const responseTwo = await transport.fetch("https://rareinsights.substack.com/api/v1/drafts", {
      method: "POST",
      body: '{"title":"Retry me"}',
    });
    const responseThree = await transport.fetch("https://rareinsights.substack.com/api/v1/drafts", {
      method: "POST",
      body: '{"title":"Retry me"}',
    });
    const responseFallback = await transport.fetch(
      "https://rareinsights.substack.com/api/v1/other",
      {
        method: "GET",
      },
    );

    assert.equal(responseOne.status, 429);
    assert.equal(responseTwo.status, 503);
    assert.equal(responseThree.status, 200);
    assert.equal((await responseThree.text()).includes("draft_url"), true);
    assert.equal(responseFallback.status, 404);
    assert.equal((await responseFallback.text()).includes("no fixture route configured"), true);

    const calls = transport.allCalls();
    assert.equal(transport.callCount(), 4);
    assert.equal(calls.length, 4);
    assert.equal(calls[0].responseStatus, 429);
    assert.equal(calls[0].responseIndex, 0);
    assert.equal(calls[1].responseStatus, 503);
    assert.equal(calls[2].responseStatus, 200);
    assert.equal(calls[3].responseStatus, 404);

    assert.equal(transport.mutationCalls().length, 3);
    assert.deepEqual(
      transport.mutationCalls().map((call) => call.responseIndex),
      [0, 1, 2],
    );
  });

  it("validates fixture input and throws a helpful error", () => {
    assert.throws(
      () =>
        parseMockTransportFixture(
          `{"scenario":"bad-fixture","generatedAt":"2026-08-07T00:00:00.000Z","calls":[]}`,
        ),
      /requires at least one route call fixture/i,
    );
  });

  it("loads fixture files from disk using fixture parser helper", async () => {
    const fixture = await loadMockTransportFixture(
      resolve(import.meta.dirname, "../../fixtures/mock-transport/draft-write-retry.json"),
    );

    assert.equal(fixture.scenario, "draft-write-retry-with-backoff");
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.calls[0].responses.length, 3);
  });

  it("drives requestWrite through deterministic replay with retries", async () => {
    const fixture = parseMockTransportFixture(`{
  "scenario": "request-write-with-retry",
  "generatedAt": "2026-08-07T00:00:00.000Z",
  "calls": [
    {
      "method": "POST",
      "url": "https://rareinsights.substack.com/api/v1/drafts",
      "responses": [
        { "status": 503 },
        { "status": 503, "body": { "error": "network outage" } },
        { "status": 200, "body": { "id": "123", "draft_url": "https://rareinsights.substack.com/p/recovered" } }
      ]
    }
  ]
}`);

    const transport = new FixtureTransport(fixture, {
      sleep: async () => undefined,
    });

    const result = await requestWrite(
      transport.fetch.bind(transport),
      "https://rareinsights.substack.com/api/v1/drafts",
      "POST",
      { "content-type": "application/json" },
      { title: "Recovered Draft" },
      { maxRetries: 2, baseDelayMs: 5, maxDelayMs: 10, idempotencyKey: "fixture-retry" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.retryAttempts, 2);
    assert.equal(result.draftId, 123);
    assert.equal(transport.callCount(), 3);
    assert.deepEqual(
      transport.allCalls().map((call) => call.responseStatus),
      [503, 503, 200],
    );
  });
});
