# Requirements

## Must have

- **MUST-01 Schedule:** Run the live canary every six hours and allow manual dispatch.
- **MUST-02 Read-only:** Permit only bounded `GET` probes against a dedicated tester publication; no publication or draft mutation is allowed.
- **MUST-03 Drift contracts:** Detect configured HTML marker and authenticated JSON path/type changes.
- **MUST-04 Secret safety:** Keep tester cookies and alert credentials in GitHub Actions secrets and out of logs, receipts, and notification text.
- **MUST-05 Network safety:** Require HTTPS `substack.com` targets, same-origin API paths, rejected redirects, timeouts, and response-size bounds.
- **MUST-06 Alerting:** Attempt every configured Slack, Discord, and PagerDuty destination when the canary fails and fail closed when none is configured.
- **MUST-07 Evidence:** Upload a redacted receipt containing check names and failure reasons but no response bodies or credentials.
- **MUST-08 Deterministic tests:** Test probe and notification behavior without live network access in normal CI.
- **MUST-09 Operations:** Document dummy-account setup, contract review, credential rotation, triage, and forbidden production usage.
- **MUST-10 Traceability:** Link Conductor T14-01, GitHub child issue #466, parent #465, Project #38, commits, PR, Actions, comments, and merge receipt.
- **MUST-11 Small PR cadence:** Deliver this bounded capability independently and remove its disposable branch/worktree after merge.
- **MUST-12 Proactive blocker closure:** Self-address repository-owned failures; retain only credentials, external service configuration, and upstream availability as explicit operator blockers.

## Should have

- **SHOULD-01 Multiple probes:** Support multiple target-specific JSON endpoints in one reviewed contract.
- **SHOULD-02 Incident deduplication:** Use a stable PagerDuty deduplication key.
- **SHOULD-03 Manual diagnosis:** Preserve manual dispatch for credential rotation and upstream-change verification.

## Could have

- **COULD-01 Recovery alerts:** Emit a resolved event after a later successful run.
- **COULD-02 Historical trends:** Aggregate non-secret drift frequency and latency after a retention/privacy policy exists.

## Won't have in this track

- Automatic contract baseline rewriting, production publication credentials, write probes, browser screenshots, or mandatory second-person approvals.
