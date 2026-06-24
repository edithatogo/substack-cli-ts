#!/usr/bin/env node
import { checkLocalApiContract, renderLocalApiContract } from "../dist/contracts/renderer.js";

const mode = process.argv[2] ?? "check";
const outFile = process.argv[3];

if (mode === "generate") {
  const result = await renderLocalApiContract({ outFile });
  console.log(`Rendered ${result.outFile}`);
} else if (mode === "check") {
  const result = await checkLocalApiContract({ outFile });
  console.log(result.message);
  process.exitCode = result.status === "ready" ? 0 : 1;
} else {
  console.error(`Unsupported contracts mode: ${mode}. Use generate or check.`);
  process.exitCode = 2;
}
