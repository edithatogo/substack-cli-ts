# Risks

| Risk | Control | Residual blocker |
| --- | --- | --- |
| Canary mutates live data | GET-only implementation and no publishing command | Upstream could violate HTTP semantics; use a dedicated tester publication |
| Cookie leakage | Same-origin host restriction, no redirects, redacted receipts, no body logging | Operator must store and rotate the cookie as a GitHub secret |
| False positives from account expiry | Distinguish authentication status failures in triage documentation | Tester session renewal remains an operator action |
| False negatives from weak markers | Require a reviewed target-specific contract with HTML and JSON probes | Operator must choose meaningful stable fields/selectors |
| Alert delivery failure | Attempt all configured providers; workflow remains failed | At least one provider secret must be configured and maintained |
| Alert storms | Six-hour cadence, workflow concurrency, stable PagerDuty dedup key | Slack/Discord deduplication is provider-dependent |
