import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("publish workflow uses OIDC without a long-lived npm token", async () => {
  const workflow = await readFile(".github/workflows/publish.yml", "utf8");
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /npm publish "\$\{tarballs\[0\]\}" --access public/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/);
});

test("publish workflow builds once and attests the downloaded tarball", async () => {
  const workflow = await readFile(".github/workflows/publish.yml", "utf8");
  assert.match(workflow, /actions\/download-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/attest@[0-9a-f]{40}/);
  assert.match(workflow, /subject-path: reports\/release\/\*\.tgz/);
  assert.equal((workflow.match(/npm run release:prepare/g) ?? []).length, 1);
  assert.match(workflow, /git merge-base --is-ancestor "\$GITHUB_SHA" origin\/master/);
  assert.match(workflow, /grep -q 'E404'/);
});

test("public package has no repository-relative dependency", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const specs = Object.values(packageJson.dependencies ?? {});
  assert.equal(specs.some((spec) => /^(file:|link:|workspace:)/.test(spec)), false);
});
