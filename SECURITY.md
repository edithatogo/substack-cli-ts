# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in `substack-cli`, please report it privately by emailing edithatogo@users.noreply.github.com.

**Do not open a public GitHub issue for security vulnerabilities.**

Please include:

- A description of the vulnerability
- Steps to reproduce (if applicable)
- The version(s) affected
- Any potential impact

You should receive a response within 48 hours. If the issue is confirmed, a fix will be prepared and released as soon as possible depending on severity.

## What to Avoid

- **Session cookies**: `substack.sid` and similar authentication tokens must never be committed or shared.
- **API tokens**: Browserbase API keys, project IDs, and similar credentials must stay in local `.env` or config files.
- **Credentials**: Substack email/password must remain in ignored local config only.

The repository includes `scripts/secret-scan.mjs` for automated secret scanning. Run `npm run scan:secrets` before committing to detect accidentally included secrets.

## Disclosure Policy

- Vulnerabilities are fixed in a private fork and released as a patch version.
- After the fix is released, a security advisory may be published describing the issue and the fix.
- We aim to release fixes within 14 days of confirmation for moderate-severity issues, and sooner for high-severity issues.
