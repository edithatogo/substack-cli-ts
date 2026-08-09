# Requirements

## Must have

- **MUST-01 Taxonomy:** A validated machine-readable registry maps every requested modality to its script, evidence, execution tier, deterministic seed policy, and CI status.
- **MUST-02 Core correctness:** Unit and regression suites cover bounded functions and preserved defects with stable fixtures.
- **MUST-03 Integrated surfaces:** Integration, CLI/TUI integration, smoke, and end-to-end suites cover module boundaries and the built CLI; TUI is explicitly not applicable until an interactive TUI exists.
- **MUST-04 Generative assurance:** Edge, property-based, metamorphic, and Zod schema-fuzz suites exercise boundary values and invariants with replayable seeds.
- **MUST-05 Deterministic systems:** Deterministic simulation testing and VCR-style network replay use virtual time, seeded events, synthetic fixtures, and fail-closed unrecorded calls.
- **MUST-06 Contracts:** Consumer-driven contract tests verify MCP and artifact producer/consumer compatibility and versioned surface invariants.
- **MUST-07 Mutation:** Stryker remains blocking with explicit mutation scope and non-zero break thresholds.
- **MUST-08 Autonomous agents:** Agentic tests exercise multi-step tool selection, least authority, prompt-injection resistance, bounded retries, and no autonomous publication.
- **MUST-09 Semantic judge:** LLM-as-a-judge harness tests require versioned rubrics, structured schemas, deterministic recorded responses, fail-closed parsing, and human accountability.
- **MUST-10 Strict execution:** The verifier and hosted CI run every deterministic required modality and retain separate receipts for credentialed canaries.
- **MUST-11 Small PR cadence:** Deliver bounded track or phase increments as regular small pull requests, inspect their complete diff, Actions, annotations, reviews, discussions, and bot comments, and merge each only after all required checks are green.
- **MUST-12 Proactive blocker closure:** Continuously classify and self-address repository-owned blockers as they arise; retain only credential, platform, authorization, or manual-review dependencies as explicit external blockers with owner actions.

## Should have

- **SHOULD-01 Live canaries:** Permit manually authorized live browser and semantic-model canaries with cost, data, model/version, timeout, and cleanup receipts.
- **SHOULD-02 Test selection:** Support fast PR suites and deeper scheduled/release suites without silently omitting required release evidence.
- **SHOULD-03 Diagnostics:** Preserve seeds, replay scenario IDs, rubric versions, mutation reports, and minimized fuzz counterexamples.

## Could have

- **COULD-01 TUI:** Add terminal-emulator snapshots if an interactive TUI is introduced.
- **COULD-02 Multi-model judging:** Compare multiple pinned judges only after variance, cost, privacy, and adjudication policy exists.

## Won't have in this track

- **WONT-01 Live-write dependency:** Normal CI will not publish, schedule, delete, or mutate live Substack content.
- **WONT-02 Uncontrolled model gate:** A nondeterministic paid external model call will not be a mandatory PR check.
- **WONT-03 Network leakage:** Replay suites will not fall through to the public network when a fixture is absent.
- **WONT-04 Test-label inflation:** Existing tests will not be relabelled as a modality unless their assertions genuinely satisfy that modality's contract.
