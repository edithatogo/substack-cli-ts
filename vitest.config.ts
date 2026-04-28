import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    pool: "threads",
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/cli.ts",
        "src/browser/**",
        "src/publish/browser-workflow.ts",
        "src/publish/local-workflow.ts",
      ],
      thresholds: {
        statements: 55,
        branches: 45,
        functions: 55,
        lines: 55,
      },
    },
  },
});
