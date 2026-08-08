import assert from "node:assert/strict";
import fc from "fast-check";
import { describe, it } from "vitest";
import { FIRST_PARTY_ARTIFACT_SCHEMAS } from "../../contracts/schemas.js";

describe("Zod schema fuzzing", () => {
  it("returns structured success or failure for arbitrary JSON without throwing", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        for (const contract of FIRST_PARTY_ARTIFACT_SCHEMAS) {
          const result = contract.schema.safeParse(value);
          assert.equal(typeof result.success, "boolean");
        }
      }),
      { seed: 13_014, numRuns: 250 },
    );
  });
});
