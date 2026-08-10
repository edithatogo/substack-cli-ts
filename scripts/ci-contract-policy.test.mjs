import assert from "node:assert/strict";
import test from "node:test";
import { validateCiContract } from "./ci-contract-policy.mjs";

const valid = {
  packageJson: {
    engines: { node: ">=22.0.0" },
    packageManager: "npm@11.17.0",
    scripts: { verify: "npm run quality && node scripts/verification-receipt.mjs" },
  },
  ci: "permissions:\n  contents: read\ntimeout-minutes: 10",
  compatibility: "permissions:\ntimeout-minutes: 15\nos: ubuntu-latest, node: 26.5.1\nos: windows-latest, node: 26.5.1\nos: macos-latest, node: 26.5.1",
  hardening: "permissions:\ntimeout-minutes: 10",
};

test("accepts the required current-runtime CI contract", () => {
  assert.deepEqual(validateCiContract(valid), []);
});

test("rejects EOL and experimental CI drift", () => {
  const failures = validateCiContract({
    ...valid,
    packageJson: { ...valid.packageJson, engines: { node: ">=20.0.0" } },
    hardening: `${valid.hardening}\nExperimental Dependency Lane`,
  });
  assert.equal(failures.length, 2);
});
