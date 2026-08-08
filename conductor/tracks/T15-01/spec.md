# Specification

## Overview

Add a Playwright-backed resilience layer for Substack 403 and browser-verification drift. Default behavior gives typed, actionable guidance; trusted local callers can opt into one browser-assisted retry for read-only requests. Local authentication records fresh ignored Playwright storage state without exposing credentials.

## Functional requirements

- Detect plain 403 responses and common Cloudflare challenge fingerprints.
- Return a typed fallback state and command guidance when no browser provider is configured.
- Permit one explicit browser-refreshed retry for JSON GET requests and API-auth validation.
- Capture standard Playwright cookies/origins after local login and through an `auth refresh-state` command.
- Support visible challenge completion and headless refresh of an already-authenticated profile.

## Non-functional requirements

- Never retry writes, launch a browser implicitly, log cookie values, commit state, upload state as evidence, or claim challenges were bypassed.
- Require a recognized Substack session cookie before persistence and use restrictive local file handling.
- Unit-test all behavior without live accounts or network calls.

## Acceptance criteria

- New and existing tests, type checks, quality, security, compatibility, mutation, and hosted review gates pass.
- Conductor, nested issues, Project #38, commits, PR, comments, merge, and cleanup remain traceable.

## Out of scope

- Automated CAPTCHA solving, Cloudflare evasion, production credential capture, write retries, remote state distribution, or CI-generated authenticated state.
