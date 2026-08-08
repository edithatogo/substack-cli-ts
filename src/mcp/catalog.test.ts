import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  buildMcpToolDescriptors,
  buildMcpToolGroups,
  buildMcpToolInputJsonSchemas,
  MCP_TOOL_INPUT_SCHEMAS,
  registerMcpTools,
} from "./catalog.js";

describe("McpToolDescriptors", () => {
  it("returns all 29 tool descriptors", () => {
    const descriptors = buildMcpToolDescriptors();
    assert.equal(descriptors.length, 29);
    assert.ok(descriptors.every((d) => d.redacted));
    assert.ok(descriptors.every((d) => d.name.length > 0));
    assert.ok(descriptors.every((d) => d.description.length > 0));
  });

  it("includes expected tools", () => {
    const descriptors = buildMcpToolDescriptors();
    const names = descriptors.map((d) => d.name);
    assert.ok(names.includes("api.inventory"));
    assert.ok(names.includes("api.auth.status"));
    assert.ok(names.includes("api.notes.list"));
    assert.ok(names.includes("api.recommendations.list"));
    assert.ok(names.includes("schema.validate"));
    assert.ok(names.includes("api.media"));
    assert.ok(names.includes("trace.review"));
    assert.ok(names.includes("trace.compare"));
    assert.ok(names.includes("policy"));
    assert.ok(names.includes("coverage.validate"));
    assert.ok(names.includes("coverage.gaps"));
    assert.ok(names.includes("coverage.inspect"));
    assert.ok(names.includes("coverage.safe_surfaces"));
    assert.ok(names.includes("coverage.safe_surface"));
    assert.ok(names.includes("launch.check"));
    assert.ok(names.includes("doctor"));
    assert.ok(names.includes("api.draft.contract"));
    assert.ok(names.includes("api.draft.contract.matrix"));
    assert.ok(names.includes("api.draft.contract.matrix.compare"));
    assert.ok(names.includes("api.draft.duplicates"));
    assert.ok(names.includes("api.draft.section"));
    assert.ok(names.includes("api.draft.inspect"));
    assert.ok(names.includes("api.draft.review"));
    assert.ok(names.includes("api.draft.compare"));
    assert.ok(names.includes("api.draft.fixture"));
    assert.ok(names.includes("campaign.plan"));
    assert.ok(names.includes("campaign.validate"));
    assert.ok(names.includes("analytics.trend"));
    assert.ok(names.includes("campaign.report"));
  });

  it("groups tools correctly", () => {
    const descriptors = buildMcpToolDescriptors();
    const readTools = descriptors.filter((d) => d.group === "read");
    const reviewTools = descriptors.filter((d) => d.group === "review");
    const captureTools = descriptors.filter((d) => d.group === "capture");
    const creatorTools = descriptors.filter((d) => d.group === "creator");

    assert.equal(readTools.length, 4);
    assert.equal(reviewTools.length, 12);
    assert.equal(captureTools.length, 9);
    assert.equal(creatorTools.length, 4);
  });

  it("has unique names across all descriptors", () => {
    const descriptors = buildMcpToolDescriptors();
    const names = descriptors.map((d) => d.name);
    assert.equal(new Set(names).size, names.length);
  });
});

describe("buildMcpToolGroups", () => {
  it("returns groups in order: read, review, capture, creator", () => {
    const groups = buildMcpToolGroups();
    assert.equal(groups.length, 4);
    assert.equal(groups[0]?.name, "read");
    assert.equal(groups[1]?.name, "review");
    assert.equal(groups[2]?.name, "capture");
    assert.equal(groups[3]?.name, "creator");
  });

  it("provides descriptions for each group", () => {
    const groups = buildMcpToolGroups();
    assert.ok(groups[0]?.description.length > 0);
    assert.ok(groups[1]?.description.length > 0);
    assert.ok(groups[2]?.description.length > 0);
    assert.ok(groups[3]?.description.length > 0);
  });

  it("includes the correct tools in each group", () => {
    const groups = buildMcpToolGroups();
    const readGroup = groups.find((g) => g.name === "read")!;
    assert.equal(readGroup.tools.length, 4);
    assert.ok(readGroup.tools.some((t) => t.name === "api.inventory"));
    assert.ok(readGroup.tools.some((t) => t.name === "api.auth.status"));
    assert.ok(readGroup.tools.some((t) => t.name === "api.notes.list"));
    assert.ok(readGroup.tools.some((t) => t.name === "api.recommendations.list"));

    const creatorGroup = groups.find((g) => g.name === "creator")!;
    assert.equal(creatorGroup.tools.length, 4);
    assert.ok(creatorGroup.tools.some((t) => t.name === "campaign.plan"));

    const reviewGroup = groups.find((g) => g.name === "review")!;
    assert.ok(reviewGroup.tools.some((t) => t.name === "coverage.validate"));
    assert.ok(reviewGroup.tools.some((t) => t.name === "coverage.safe_surfaces"));
    assert.ok(reviewGroup.tools.some((t) => t.name === "coverage.safe_surface"));
    assert.ok(reviewGroup.tools.some((t) => t.name === "launch.check"));
  });

  it("sets redacted to true on all tool surfaces", () => {
    const groups = buildMcpToolGroups();
    for (const group of groups) {
      assert.ok(group.tools.every((t) => t.redacted));
    }
  });
});

describe("registerMcpTools", () => {
  it("calls registerTool for each descriptor", () => {
    const registered: string[] = [];
    const mockServer = {
      registerTool: (name: string, _schema: unknown, _handler: unknown) => {
        registered.push(name);
      },
    };

    registerMcpTools(mockServer as Parameters<typeof registerMcpTools>[0]);
    assert.equal(registered.length, 29);
  });

  it("registers safe coverage tool handlers", async () => {
    const handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();
    const mockServer = {
      registerTool: (name: string, _schema: unknown, handler: unknown) => {
        handlers.set(name, handler as (args: Record<string, unknown>) => Promise<unknown>);
      },
    };

    registerMcpTools(mockServer as Parameters<typeof registerMcpTools>[0]);

    const validation = (await handlers.get("coverage.validate")?.({})) as {
      structuredContent: { status: string };
    };
    const missing = (await handlers.get("coverage.inspect")?.({
      capabilityId: "missing-capability",
    })) as {
      structuredContent: { status: string; message: string };
    };
    const launch = (await handlers.get("launch.check")?.({})) as {
      structuredContent: { checklist: { status: string } };
    };
    const safeSurfaces = (await handlers.get("coverage.safe_surfaces")?.({})) as {
      structuredContent: { count: number };
    };
    const safeSurface = (await handlers.get("coverage.safe_surface")?.({
      id: "chat-dm-live-chat",
    })) as {
      structuredContent: { status: string; surface: { status: string } };
    };

    assert.equal(validation.structuredContent.status, "ready");
    assert.equal(missing.structuredContent.status, "blocked");
    assert.equal(missing.structuredContent.message, "Capability ID was not found.");
    assert.equal(launch.structuredContent.checklist.status, "ready");
    assert.equal(safeSurfaces.structuredContent.count, 8);
    assert.equal(safeSurface.structuredContent.status, "ready");
    assert.equal(safeSurface.structuredContent.surface.status, "unsupported");
  });

  it("registers every tool with its canonical Zod object schema", () => {
    const registered = new Map<string, unknown>();
    const mockServer = {
      registerTool: (name: string, config: { inputSchema?: unknown }) => {
        registered.set(name, config.inputSchema);
      },
    };

    registerMcpTools(mockServer as Parameters<typeof registerMcpTools>[0]);

    assert.equal(registered.size, 29);
    assert.deepEqual([...registered.keys()].sort(), Object.keys(MCP_TOOL_INPUT_SCHEMAS).sort());
    for (const [name, schema] of Object.entries(MCP_TOOL_INPUT_SCHEMAS)) {
      assert.equal(registered.get(name), schema);
    }
  });

  it("coerces bounded numeric-string pagination and applies defaults", () => {
    assert.deepEqual(MCP_TOOL_INPUT_SCHEMAS["api.inventory"].parse({ postLimit: "5" }), {
      postLimit: 5,
    });
    assert.deepEqual(MCP_TOOL_INPUT_SCHEMAS["api.notes.list"].parse({}), { limit: 10 });
    assert.throws(() => MCP_TOOL_INPUT_SCHEMAS["api.notes.list"].parse({ limit: "" }));
    assert.throws(() => MCP_TOOL_INPUT_SCHEMAS["api.notes.list"].parse({ limit: "5.5" }));
    assert.throws(() => MCP_TOOL_INPUT_SCHEMAS["api.notes.list"].parse({ limit: "101" }));
  });

  it("rejects missing required fields and unknown fields", () => {
    assert.throws(() => MCP_TOOL_INPUT_SCHEMAS["schema.validate"].parse({}));
    assert.throws(() =>
      MCP_TOOL_INPUT_SCHEMAS["schema.validate"].parse({ file: "fixture.json", surprise: true }),
    );
    assert.throws(() => MCP_TOOL_INPUT_SCHEMAS["api.auth.status"].parse({ token: "secret" }));
  });

  it("generates strict described JSON Schemas from the canonical Zod inputs", () => {
    const schemas = buildMcpToolInputJsonSchemas();
    assert.deepEqual(Object.keys(schemas).sort(), Object.keys(MCP_TOOL_INPUT_SCHEMAS).sort());

    for (const schema of Object.values(schemas)) {
      assert.equal(schema.type, "object");
      assert.equal(schema.additionalProperties, false);
    }

    const inventory = schemas["api.inventory"] as {
      properties: { postLimit: Record<string, unknown> };
    };
    assert.equal(inventory.properties.postLimit.type, "integer");
    assert.equal(inventory.properties.postLimit.minimum, 1);
    assert.equal(inventory.properties.postLimit.maximum, 100);
    assert.equal(inventory.properties.postLimit.default, 10);
    assert.match(String(inventory.properties.postLimit.description), /1 through 100/);
  });

  it("rejects invalid coverage gap filters", async () => {
    const handlers = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();
    const mockServer = {
      registerTool: (name: string, _schema: unknown, handler: unknown) => {
        handlers.set(name, handler as (args: Record<string, unknown>) => Promise<unknown>);
      },
    };

    registerMcpTools(mockServer as Parameters<typeof registerMcpTools>[0]);

    await assert.rejects(
      () => handlers.get("coverage.gaps")?.({ status: "finished" }),
      /Unsupported coverage status/,
    );
    await assert.rejects(
      () => handlers.get("coverage.gaps")?.({ domain: "newsletter" }),
      /Unsupported coverage domain/,
    );
  });
});
