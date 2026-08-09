import { readFile } from "node:fs/promises";

const spdx = JSON.parse(await readFile("reports/sbom/package.spdx.json", "utf8"));
const cyclonedx = JSON.parse(await readFile("reports/sbom/package.cdx.json", "utf8"));
const failures = [];

if (spdx.spdxVersion !== "SPDX-2.3") failures.push("SPDX version must be 2.3.");
if (spdx.dataLicense !== "CC0-1.0") failures.push("SPDX data license must be CC0-1.0.");
if (!Array.isArray(spdx.packages) || spdx.packages.length < 2) {
  failures.push("SPDX package inventory is missing or empty.");
}
if (cyclonedx.bomFormat !== "CycloneDX" || cyclonedx.specVersion !== "1.6") {
  failures.push("CycloneDX document must use specification 1.6.");
}
if (!Array.isArray(cyclonedx.components) || cyclonedx.components.length < 1) {
  failures.push("CycloneDX component inventory is missing or empty.");
}
if (spdx.packages.length !== cyclonedx.components.length + 1) {
  failures.push("SPDX and CycloneDX package inventories do not agree.");
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `SBOM validation passed: ${spdx.packages.length} SPDX packages and ${cyclonedx.components.length} CycloneDX components.`,
  );
}
