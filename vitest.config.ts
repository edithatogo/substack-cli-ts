import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/test/e2e/**"],
    pool: "threads",
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/test/**",
        "src/cli.ts",
        "src/auth/local-login.ts",
        "src/auth/substack-login.ts",
        "src/benchmark/**",
        "src/browser/**",
        "src/doctor/**",
        "src/mcp/**",
        "src/schema/**",
        "src/substack-api/**",
        "src/publish/browser-workflow.ts",
        "src/publish/local-workflow.ts",
      ],
      thresholds: {
        statements: 91,
        branches: 91,
        functions: 91,
        lines: 91,
      },
    },
  },
});
