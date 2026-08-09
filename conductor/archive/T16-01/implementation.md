# Implementation ledger

## 2026-08-09

- Created nested P16 issue #473 and T16-01 issue #474; added both to Project #38.
- Confirmed MCP SDK 1.30 accepts complete Zod schemas at `registerTool` and infers parsed handler output.
- Rejected `zod-to-json-schema` 3.25.2 after it emitted an empty schema for a Zod 4 strict object; retained no dependency change.
- Added canonical strict schemas for all 29 tools, bounded pagination preprocessing, native Draft 2020-12 export, and deterministic assurance.
- Local evidence: 15 focused MCP tests, 116 files/911 full tests, typecheck, build, Biome CI, and production audit with zero vulnerabilities all passed.
- Validation, commit note, PR, hosted checks/comments, merge, archive, and cleanup receipts remain pending.
- Closeout verified on 2026-08-09: PR #475 merged as `24621e4128f9f3946a261fe53a0326c3f9df091f` with all available non-conditional checks green, full Codecov patch coverage, and no actionable feedback. Issues #473 and #474 are closed and the track is archived.
