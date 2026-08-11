import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "src/parser/frontmatter.test.ts",
      "src/parser/schema.test.ts",
      "src/parser/markdown.test.ts",
      "src/parser/media.test.ts",
      "src/publish/title.test.ts",
      "src/publish/prepare.test.ts",
      "src/publish/prepublish.test.ts",
      "src/policy/distribution.test.ts",
      "src/substack-api/payload.test.ts",
      "src/substack-api/publish-write.test.ts",
      "src/test/assurance/regression.test.ts",
    ],
    pool: "threads",
    testTimeout: 60_000,
  },
});
