# Track 04: Browser Runtime Hardening

## Goal

Make browser execution reliable across local development and optional remote sessions while protecting credentials.

## Current State

- Local Chrome persistent profile works for password login and manual CAPTCHA completion.
- Local runtime is the default for password-based Substack login.
- Browserbase and Stagehand are scaffolded but not validated for authenticated publishing.

## Next Tasks

1. Add browser runtime smoke tests that do not require real credentials.
2. Improve diagnostics for stale profile locks, closed browser contexts, and unauthenticated redirects.
3. Add trace and screenshot capture behind an explicit opt-in flag, with secret redaction guidance.
4. Validate Browserbase only with a session created interactively or with non-sensitive test credentials.
5. Evaluate Stagehand for semantic button discovery after the deterministic local workflow is stable.

## Acceptance Criteria

- Local browser failures produce actionable messages.
- No command logs passwords, API keys, cookies, or session payloads.
- Remote runtime documentation clearly separates local password login from Browserbase session reuse.
