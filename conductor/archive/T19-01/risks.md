# Risks and contingencies T19-01

- **Private-schema drift:** fingerprint observed schemas and downgrade stale profiles to unknown, requiring canary verification.
- **False-positive blocking:** distinguish hard primary-editor errors from auxiliary editability warnings and allow an explicit, receipt-backed override only for the latter.
- **Lossy normalization:** never apply automatically; require preview, user selection and reversible source preservation.
- **Canary side effects:** use a disposable non-public target, disable email, verify target identity, and record cleanup or restoration.
- **Authentication/rate limiting:** stop on expiry, CAPTCHA/2FA or active cooldown; do not retry aggressively.
- **Cleanup failure:** retain the canary identifier and recovery instructions; do not claim completion.
- **Upstream non-response:** preserve static checks and CLI-only update contingency while keeping the limitation visible.
- **Diagnostic privacy:** use synthetic fixtures and content-free receipts only.
