# Risks

| Risk | Control | Residual blocker |
| --- | --- | --- |
| Storage state leaks credentials | Ignored state directory, private mode, atomic replacement, secret-free summaries | Windows permission semantics and local host security remain operator responsibilities |
| Browser fallback bypasses access controls | No CAPTCHA solving; visible human completion; guidance-only default | Upstream may continue denying access |
| Mutation is replayed after ambiguous failure | Fallback exists only on `requestJson`; write APIs remain unchanged | Callers must not wrap write functions in custom fallback code |
| 403 has a non-auth cause | Typed result remains visible and only one opt-in retry is allowed | Operator may need upstream investigation |
| Headless mode triggers stronger challenges | Headed default and explicit headless flag | Existing profile may still expire |
| State becomes stale | Refresh command and expiry summary | Renewal remains a credentialed local action |
