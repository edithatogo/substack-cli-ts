#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const outputDirectory = resolve(process.argv[2] || "reports/sbom");
const spdxFile = resolve(outputDirectory, "package.spdx.json");
const cyclonedxFile = resolve(outputDirectory, "package.cdx.json");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));
const lockPackages = Object.entries(packageLock.packages ?? {})
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
const spdxDocument = {
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
    ...lockPackages,
  ],
  relationships: lockPackages.map((pkg) => ({
    spdxElementId: rootPackageId,
    relationshipType: "DEPENDS_ON",
    relatedSpdxElement: pkg.SPDXID,
  })),
};

const cyclonedxDocument = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${deterministicUuid(`${packageJson.name}@${packageJson.version}`)}`,
  version: 1,
  metadata: {
    timestamp: spdxDocument.creationInfo.created,
    tools: { components: [{ type: "application", name: "package-sbom.mjs" }] },
    component: {
      type: "application",
      "bom-ref": `${packageJson.name}@${packageJson.version}`,
      name: packageJson.name,
      version: packageJson.version,
      licenses: packageJson.license ? [{ license: { id: packageJson.license } }] : [],
      purl: packagePurl(packageJson.name, packageJson.version),
    },
  },
  components: lockPackages.map((pkg) => ({
    type: "library",
    "bom-ref": `${pkg.name}@${pkg.versionInfo}`,
    name: pkg.name,
    version: pkg.versionInfo,
    purl: packagePurl(pkg.name, pkg.versionInfo),
    licenses:
      pkg.licenseDeclared === "NOASSERTION"
        ? []
        : [{ license: { id: pkg.licenseDeclared } }],
  })),
  dependencies: [
    {
      ref: `${packageJson.name}@${packageJson.version}`,
      dependsOn: lockPackages.map((pkg) => `${pkg.name}@${pkg.versionInfo}`),
    },
  ],
};

await mkdir(dirname(spdxFile), { recursive: true });
await writeFile(spdxFile, `${JSON.stringify(spdxDocument, null, 2)}\n`, "utf8");
await writeFile(cyclonedxFile, `${JSON.stringify(cyclonedxDocument, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify({
    operation: "sbom.generate",
    outputs: [spdxFile, cyclonedxFile],
    packages: lockPackages.length + 1,
  }),
);

function safeSpdxId(value) {
  return String(value).replace(/[^A-Za-z0-9.-]/g, "-");
}

function packageNameFromLockPath(path) {
  const parts = path.replace(/^node_modules\//, "").split("/node_modules/");
  return parts.at(-1) ?? path;
}

function packagePurl(name, version) {
  return `pkg:npm/${encodeURIComponent(name).replaceAll("%40", "@").replaceAll("%2F", "/")}@${version}`;
}

function deterministicUuid(value) {
  const bytes = new TextEncoder().encode(value);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8).padEnd(8, "0")}-${hex.slice(8, 12).padEnd(4, "0")}-5${hex.slice(13, 16).padEnd(3, "0")}-8${hex.slice(17, 20).padEnd(3, "0")}-${hex.slice(20, 32).padEnd(12, "0")}`;
}
