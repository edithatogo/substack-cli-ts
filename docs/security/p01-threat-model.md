# P01 Boundary Threat Model

This document records the fail-closed boundaries introduced for publication
automation. It does not grant access to Substack credentials or private
endpoints.

| Boundary | Threat | Control | Evidence |
| --- | --- | --- | --- |
| Origin | SSRF or credential forwarding to an attacker origin | `TrustedOriginPolicy` permits only HTTPS publication and `substack.com` origins and rejects redirects outside them | `src/security/boundaries.test.ts` |
| Publication authority | A valid account session mutates the wrong publication | `authorizePublicationSession` binds the session to the configured publication ID and an explicit publication role | `src/security/boundaries.test.ts` |
| Workspace | Path traversal reads or writes credentials and state | `WorkspaceGuard` resolves and checks containment before workspace I/O | `src/security/boundaries.test.ts` |
| Mutation outcome | A timeout causes an unsafe duplicate write | `MutationOutcome` records outcome-unknown and requires reconciliation before replay | `src/substack-api/mutation-outcome.test.ts` |
| Observability | Cookies or identifiers leak into diagnostics | Existing centralized redaction remains the only durable diagnostic path | `src/util/redact.ts` |

Unknown mutation outcomes are not success or failure. Callers must reconcile the
remote state before retrying, and no automatic replay is permitted.
