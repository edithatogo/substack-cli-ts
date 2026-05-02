# Track 04: Browser Runtime Hardening

## Goal

Make browser execution reliable across local development and optional remote sessions while protecting credentials.

## Current State

- Local Chrome persistent profile works for password login and manual CAPTCHA completion.
- Local runtime is the default for password-based Substack login.
- Browserbase and Stagehand are scaffolded but not validated for authenticated publishing.

## Completed

1. ✅ Typed error classes (`src/browser/errors.ts`): `BrowserNotFoundError`, `CaptchaDetectedError`, `SessionTimeoutError`, `NavigationTimeoutError`.
2. ✅ Chrome binary detection (`createLocalBrowserSessionWithRetry`): checks `PLAYWRIGHT_BROWSERS_PATH` and `getChromePath()`, throws `BrowserNotFoundError` with install instructions if not found.
3. ✅ Retry logic for local browser launch: 3 retries with exponential backoff (2s, 4s, capped 10s).
4. ✅ Stagehand retry wrapper (`withStagehandRetry`): retries up to 2 times on transient failures (timeout, `net::ERR_*`, target/session closed).
5. ✅ CAPTCHA detection (`checkForCaptcha`): checks page URL for "challenge"/"captcha" and inspects for visible captcha iframes. Throws `CaptchaDetectedError` with Browserbase debug URL.
6. ✅ CAPTCHA checks after every navigation step in `browser-workflow.ts` (navigate-publication, navigate-existing-draft).
7. ✅ `observedAct` wrapped with `withStagehandRetry` for transient-failure resilience.

## Acceptance Criteria

- Local browser failures produce actionable messages.
- No command logs passwords, API keys, cookies, or session payloads.
- Remote runtime documentation clearly separates local password login from Browserbase session reuse.
