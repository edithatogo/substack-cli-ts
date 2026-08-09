# Track T13-01: Comprehensive deterministic test taxonomy and assurance harness

## Overview

Make every user-requested testing modality explicit, independently runnable, deterministic by default, and enforced through a machine-readable taxonomy. Reuse existing tests where they already provide valid evidence and add focused suites where coverage is implicit or absent.

## Functional requirements

- Register unit, regression, integration, end-to-end, smoke, edge, mutation, property-based, deterministic simulation, consumer-driven contract, metamorphic, autonomous agentic, semantic LLM-as-a-judge, network replay/VCR, CLI integration, and Zod schema-fuzz testing.
- Give every modality a package script, owned test/config evidence, execution tier, determinism declaration, and CI policy.
- Test parser, contract, MCP, CLI, network retry/replay, and agent safety surfaces without live publication or secrets.
- Require deterministic model and agent adapters in normal CI; isolate credentialed live-model/browser checks as explicit canaries.
- Include taxonomy validation in the one-command verifier and hosted CI.

## Non-functional requirements

- Tests are hermetic, seedable, fail closed, and safe for parallel execution.
- No required PR gate depends on live Substack writes, paid LLM calls, mutable network responses, or unavailable credentials.
- Fixtures contain only synthetic, redacted data and replay must prevent unrecorded network access.
- Test naming, paths, timeouts, and receipts make modality ownership auditable.

## Acceptance criteria

- The taxonomy validator reports every requested modality with a valid script and evidence path.
- All deterministic suites pass locally and in required CI; mutation and security fuzzing retain blocking thresholds.
- Agentic tests demonstrate policy-bounded planning and adversarial prompt refusal.
- Semantic-judge tests validate rubric input, structured output, fail-closed behavior, and deterministic replay without claiming a live model was exercised.
- CLI e2e/smoke tests exercise the built distribution, while credentialed browser publication remains a separately labelled canary.

## Out of scope

- Unapproved live Substack mutations.
- Sending repository, user, or secret data to an external model during normal CI.
- Treating a mock judge as evidence of a specific hosted model's quality.
