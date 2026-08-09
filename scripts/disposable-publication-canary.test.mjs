import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { CORE_SCHEMA, load } from "js-yaml";
import { parseLifecycleContract, runDisposableCanary, validateGuard } from "./disposable-publication-canary.mjs";

const env = {
  GITHUB_EVENT_NAME: "workflow_dispatch",
  SUBSTACK_CANARY_CONFIRM: "RUN DISPOSABLE CANARY",
  SUBSTACK_DISPOSABLE_PUBLICATION_URL: "https://disposable-canary.substack.com",
  SUBSTACK_CANARY_PRODUCTION_URLS: "https://real-publication.substack.com",
  SUBSTACK_CANARY_RUN_ID: "run-42",
  SUBSTACK_TEST_COOKIE: "substack.sid=secret",
  SUBSTACK_DISPOSABLE_CONTRACT_JSON: JSON.stringify({
    draftIdPath: "draft.id",
    actions: {
      create: { path: "/drafts", method: "POST" },
      reconcile: { path: "/drafts/{draftId}", method: "GET" },
      revise: { path: "/drafts/{draftId}", method: "PUT" },
      unschedule: { path: "/drafts/{draftId}/unschedule", method: "POST" },
      cleanup: { path: "/drafts/{draftId}", method: "DELETE" },
    },
  }),
};

describe("disposable publication canary", () => {
  it("is exposed only through manual workflow dispatch", async () => {
    const workflow = load(await readFile(".github/workflows/disposable-publication-canary.yml", "utf8"), {
      schema: CORE_SCHEMA,
    });
    assert.deepEqual(Object.keys(workflow.on), ["workflow_dispatch"]);
  });

  it("rejects PR events, production targets and unsafe endpoint contracts", () => {
    assert.throws(() => validateGuard({ ...env, GITHUB_EVENT_NAME: "pull_request" }), /workflow_dispatch/);
    assert.throws(
      () => validateGuard({ ...env, SUBSTACK_DISPOSABLE_PUBLICATION_URL: "https://real-publication.substack.com" }),
      /production publication/,
    );
    assert.throws(
      () => parseLifecycleContract(env.SUBSTACK_DISPOSABLE_CONTRACT_JSON.replace('"DELETE"', '"POST"')),
      /not allowed/,
    );
  });

  it("runs the lifecycle and removes uniquely marked content", async () => {
    const calls = [];
    const fetchFn = async (url, options) => {
      calls.push({ url: String(url), options });
      if (calls.length === 1) return Response.json({ draft: { id: 42 } });
      if (calls.length === 2) return Response.json({ title: "[substack-publisher-canary:run-42]" });
      return calls.length === 5 ? new Response(null, { status: 204 }) : Response.json({ ok: true });
    };
    const receipt = await runDisposableCanary({ env, fetchFn });
    assert.equal(receipt.status, "passed");
    assert.equal(receipt.cleanup, "passed");
    assert.deepEqual(calls.map((call) => call.options.method), ["POST", "GET", "PUT", "POST", "DELETE"]);
    assert.doesNotMatch(JSON.stringify(receipt), /substack\.sid/);
  });

  it("attempts cleanup and marks uncertainty after a lifecycle failure", async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      if (calls === 1) return Response.json({ draft: { id: 9 } });
      if (calls === 2) return Response.json({ title: "[substack-publisher-canary:run-42]" });
      if (calls === 3) return new Response("conflict", { status: 409 });
      return new Response(null, { status: 204 });
    };
    const receipt = await runDisposableCanary({ env, fetchFn });
    assert.equal(receipt.status, "uncertain");
    assert.equal(receipt.cleanup, "passed");
    assert.equal(calls, 4);
  });
});
