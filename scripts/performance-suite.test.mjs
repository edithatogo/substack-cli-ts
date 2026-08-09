import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareBudgets } from "./performance-suite.mjs";

describe("performance budget comparison", () => {
  it("passes values within every declared budget", () => {
    assert.deepEqual(
      compareBudgets(
        { timingsMs: { startup: 10 }, sizesBytes: { package: 20 } },
        { budgetsMs: { startup: 10 }, budgetsBytes: { package: 20 } },
      ),
      [],
    );
  });

  it("fails regressions and missing budgets", () => {
    assert.deepEqual(
      compareBudgets(
        { timingsMs: { startup: 11, parser: 1 }, sizesBytes: { package: 21 } },
        { budgetsMs: { startup: 10 }, budgetsBytes: { package: 20 } },
      ),
      ["startup 11ms exceeds 10ms", "parser has no time budget", "package 21 bytes exceeds 20 bytes"],
    );
  });
});
