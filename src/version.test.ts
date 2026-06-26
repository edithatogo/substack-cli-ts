import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { PACKAGE_VERSION, getPackageVersion } from "./version.js";

describe("PACKAGE_VERSION", () => {
  it("matches the version declared in package.json", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      version: string;
    };
    assert.equal(PACKAGE_VERSION, manifest.version);
  });

  it("is a non-empty semantic-version string", () => {
    assert.ok(typeof PACKAGE_VERSION === "string");
    assert.ok(PACKAGE_VERSION.length > 0);
    assert.match(PACKAGE_VERSION, /^\d+\.\d+\.\d+/);
  });
});

describe("getPackageVersion", () => {
  it("returns the same value as the constant", () => {
    assert.equal(getPackageVersion(), PACKAGE_VERSION);
  });
});
