#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const outFile = process.argv[2] || "reports/sbom/package.spdx.json";
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const packages = Object.entries(packageLock.packages ?? {})
  .filter(([path]) => path.startsWith("node_modules/"))
  .map(([path, meta]) => {
    const name = packageNameFromLockPath(path);
    return {
      SPDXID: `SPDXRef-Package-${safeSpdxId(name)}`,
      name,
      versionInfo: meta.version ?? "NOASSERTION",
      downloadLocation: meta.resolved ?? "NOASSERTION",
      licenseConcluded: meta.license ?? "NOASSERTION",
      licenseDeclared: meta.license ?? "NOASSERTION",
      supplier: "NOASSERTION",
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

const rootPackageId = `SPDXRef-Package-${safeSpdxId(packageJson.name)}`;
const document = {
  spdxVersion: "SPDX-2.3",
  dataLicense: "CC0-1.0",
  SPDXID: "SPDXRef-DOCUMENT",
  name: `${packageJson.name}-sbom`,
  documentNamespace: `https://github.com/edithatogo/substack-cli-ts/sbom/${packageJson.version}`,
  creationInfo: {
    created: new Date().toISOString(),
    creators: ["Tool: substack-cli package-sbom.mjs"],
  },
  packages: [
    {
      SPDXID: rootPackageId,
      name: packageJson.name,
      versionInfo: packageJson.version,
      downloadLocation: packageJson.repository?.url ?? "NOASSERTION",
      licenseConcluded: packageJson.license ?? "NOASSERTION",
      licenseDeclared: packageJson.license ?? "NOASSERTION",
      supplier: "NOASSERTION",
    },
    ...packages,
  ],
  relationships: packages.map((pkg) => ({
    spdxElementId: rootPackageId,
    relationshipType: "DEPENDS_ON",
    relatedSpdxElement: pkg.SPDXID,
  })),
};

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ operation: "sbom.generate", outputFile: outFile, packages: packages.length + 1 }));

function safeSpdxId(value) {
  return String(value).replace(/[^A-Za-z0-9.-]/g, "-");
}

function packageNameFromLockPath(path) {
  const parts = path.replace(/^node_modules\//, "").split("/node_modules/");
  return parts.at(-1) ?? path;
}
