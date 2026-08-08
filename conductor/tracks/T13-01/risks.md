# Risks

| Risk | Control | Closure evidence |
| --- | --- | --- |
| Test names overstate actual assurance | Taxonomy validator and modality-specific acceptance assertions | Taxonomy receipt and focused suite output |
| Generative tests become flaky | Fixed seeds, minimized counterexamples, bounded runs and replay instructions | Property/fuzz receipt with seed |
| Agent test performs unauthorized actions | Synthetic tool catalogue, least-authority policy and no live transport | Agent scenario receipt |
| Mock judge is mistaken for live model quality | Explicit deterministic-adapter label and separate live-canary state | Semantic judge receipt with provider mode |
| Replay leaks to the network | Fixture transport returns a hard failure for unmatched calls | VCR negative test |
| E2E requires unavailable credentials | Built-CLI e2e is deterministic; live browser publication remains manual canary | Separate e2e and canary receipts |
| Deep suite makes PR feedback unusably slow | Fast/deep tiers with all release gates retained | CI timing receipt |
