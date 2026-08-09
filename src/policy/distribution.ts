import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const PackageJsonSchema = z.object({
  private: z.boolean().optional(),
  license: z.string().optional(),
  files: z.array(z.string()).default([]),
  dependencies: z.record(z.string(), z.string()).default({}),
  optionalDependencies: z.record(z.string(), z.string()).default({}),
  devDependencies: z.record(z.string(), z.string()).default({}),
});

export type DistributionPolicyStatus = "ok" | "warn" | "error";

export interface DistributionPolicyReport {
  status: DistributionPolicyStatus;
  privatePackage: boolean;
  distributable: boolean;
  license?: string | undefined;
  licenseFilePresent: boolean;
  nonRegistryDependencies: string[];
  message: string;
}

export async function evaluateDistributionPolicy(
  projectRoot = process.cwd(),
): Promise<DistributionPolicyReport> {
  const packageJson = PackageJsonSchema.parse(
    JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")),
  );
  const licenseFilePresent =
    (await exists(join(projectRoot, "LICENSE"))) || (await exists(join(projectRoot, "LICENSE.md")));
  const nonRegistryDependencies = findNonRegistryDependencies(packageJson);
  const privatePackage = packageJson.private === true;
  const distributable = !privatePackage;

  if (privatePackage) {
    return {
      status: "ok",
      privatePackage,
      distributable,
      license: packageJson.license,
      licenseFilePresent,
      nonRegistryDependencies,
      message: "Package is marked private; distributability policy is recorded but not enforced.",
    };
  }

  if (!packageJson.license || !licenseFilePresent || nonRegistryDependencies.length > 0) {
    return {
      status: "warn",
      privatePackage,
      distributable,
      license: packageJson.license,
      licenseFilePresent,
      nonRegistryDependencies,
      message:
        "Package is public, but its license or dependency policy is not fully ready for distribution.",
    };
  }

  return {
    status: "ok",
    privatePackage,
    distributable,
    license: packageJson.license,
    licenseFilePresent,
    nonRegistryDependencies,
    message: "Package is public and has basic distribution policy metadata in place.",
  };
}

function findNonRegistryDependencies(packageJson: z.infer<typeof PackageJsonSchema>): string[] {
  return [
    ...Object.entries(packageJson.dependencies),
    ...Object.entries(packageJson.optionalDependencies),
    ...Object.entries(packageJson.devDependencies),
  ]
    .filter(
      ([, spec]) =>
        spec.startsWith("file:") ||
        spec.startsWith("link:") ||
        spec.startsWith("workspace:") ||
        spec.startsWith("git+") ||
        spec.startsWith("http:") ||
        spec.startsWith("https:"),
    )
    .map(([name]) => name);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function summarizeDistributionPolicy(report: DistributionPolicyReport): unknown {
  return report;
}
