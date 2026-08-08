# Browser authentication resilience

Substack can return HTTP 403 or browser-verification pages when its undocumented login and API controls change. The library detects common Cloudflare fingerprints and supports one explicit Playwright-backed refresh for read-only API requests. Mutation requests never use this fallback or replay automatically.

## Refresh local test state

Configure the local runtime and publication, authenticate with the visible browser, then capture fresh Playwright state:

```powershell
node dist/cli.js config set-runtime local
node dist/cli.js auth login --wait-seconds 120
npm run auth:refresh-state -- --wait-seconds 120
```

The local-login flow automatically attempts the same capture after authentication. The refresh command uses a visible browser by default so a human can complete a challenge. Use `--headless --wait-seconds 0` only when the persistent profile is already authenticated.

The standard Playwright state is written to `.substack-cli/auth/storage-state.json`. The whole `.substack-cli/` directory is ignored by Git. The writer requires a recognized Substack session cookie, uses owner-only file permissions where the platform supports them, writes through a temporary file, and returns only cookie counts and expiry metadata.

## Library fallback

`requestJsonWithBrowserFallback` never launches a browser implicitly. Without a provider it returns `browserFallback: "required"`; callers can display the `auth refresh-state` action. Trusted local callers may provide `refreshHeaders`, which is invoked once before a single GET retry. `validateApiAuthMaterial` similarly accepts an optional local-profile material provider.

Do not provide browser fallback callbacks to write operations, commit storage-state files, upload them as CI artifacts, use production accounts for resilience tests, or attempt to evade access controls. If a challenge persists in a visible browser, stop and complete or investigate it manually.
