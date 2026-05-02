import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/test/e2e/**/*.e2e.ts"],
    pool: "threads",
    testTimeout: 60_000,
  },
});
