#!/usr/bin/env node
process.stdout.write(
  `${JSON.stringify({
    additional_context:
      "Read AGENTS.md and conductor/index.md before writing. This is a solo-maintainer repo: 0 required reviews, no CODEOWNERS. Fail-closed on live Substack writes. After TypeScript changes run npm run verify:agent. Do not rewrite conductor/github-programme.json unless that is the task.",
  })}\n`,
);
