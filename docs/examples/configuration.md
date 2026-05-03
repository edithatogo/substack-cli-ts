# Configuration

## Setting the Publication URL

Tell substack-cli which Substack publication to target:

```bash
substack-cli config set-publication https://mynewsletter.substack.com
```

## Setting the Browser Runtime

Choose how the browser automation runs:

```bash
# Use a local Chrome/Chromium profile (persistent, good for development)
substack-cli config set-runtime local

# Use Browserbase cloud browsers (production, headless)
substack-cli config set-runtime browserbase

# Use Camoufox (anti-detection browser)
substack-cli config set-runtime camoufox
```

### Runtime Comparison

| Runtime | Use Case | Persistence | CAPTCHA |
|---------|----------|-------------|---------|
| `local` | Development, testing | Local Chrome profile | Manual login only |
| `browserbase` | Production, CI | Cloud session ID | Manual login via live session |
| `camoufox` | Anti-detection | Local ephemeral | Manual login |

## Viewing Current Configuration

```bash
substack-cli config show
```

This prints the effective configuration without exposing secrets. It shows the
publication URL, runtime setting, and status of various environment checks.

## Authentication Status

```bash
# Full auth status including transport readiness
substack-cli auth status

# API-specific auth check
substack-cli api auth status

# Force a specific auth source
substack-cli api auth status --source env
substack-cli api auth status --source local-profile
```

## Login

```bash
# Interactive browser login (opens a session you log into manually)
substack-cli auth login

# Auto-login using SUBSTACK_EMAIL and SUBSTACK_PASSWORD environment variables
substack-cli auth login --auto-login

# Auto-login with pause before entering password (for debugging)
substack-cli auth login --auto-login --pause-before-password

# Resume an existing Browserbase session
substack-cli auth login --session-id sess_abc123

# Keep session open for manual interaction
substack-cli auth login --wait-seconds 120
```

## Logout

```bash
# Clear the stored Browserbase session ID
substack-cli auth logout
```

## Environment Variables

| Variable | Required For | Description |
|----------|-------------|-------------|
| `SUBSTACK_EMAIL` | `--auto-login` | Substack account email |
| `SUBSTACK_PASSWORD` | `--auto-login` | Substack account password |
| `BROWSERBASE_API_KEY` | `browserbase` runtime | Browserbase API key |
| `BROWSERBASE_PROJECT_ID` | `browserbase` runtime | Browserbase project ID |
