# Specification

## Overview

Make the MCP catalog safe for imperfect agent arguments by defining every tool input as a canonical strict Zod object. The MCP SDK consumes those objects directly, while JSON Schema is generated from the same source for clients and contract assurance.

## Functional requirements

- Register all 29 MCP tools with complete Zod object schemas, including tools with no arguments.
- Normalize decimal integer strings for bounded pagination limits before handlers run.
- Apply a default limit of 10 and enforce the inclusive range 1 through 100.
- Reject missing required fields, blank or non-integer limits, out-of-range limits, and unknown keys.
- Export Draft 2020-12 JSON Schemas generated from the canonical Zod inputs.
- Describe every accepted field so MCP clients and agents receive actionable contracts.

## Non-functional requirements

- Do not hand-author JSON Schema or maintain a second validation model.
- Do not coerce paths, identifiers, timestamps, booleans, or arbitrary strings.
- Do not expose credentials or perform live Substack operations in tests.
- Keep the change independently reviewable and compatible with the current MCP SDK and Zod 4.

## Acceptance criteria

- Catalog tests prove schema coverage, registration identity, coercion, defaults, bounds, required fields, unknown-field rejection, and generated-schema fidelity.
- Existing local and hosted quality, security, compatibility, coverage, and mutation gates pass.
- Conductor, nested issues, Project #38, commits, notes, PR, comments, merge, and cleanup remain traceable.

## Out of scope

- Output-schema migration, mutation-tool expansion, live agent calls, or broad dependency upgrades.
