#!/usr/bin/env node
process.stdout.write(
  `${JSON.stringify({
    user_message:
      "If TypeScript changed, run npm run verify:agent (typecheck + test + inspect examples/basic.md). Do not commit unless asked.",
  })}\n`,
);
