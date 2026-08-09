# Specification

## Overview

Add an early-warning system for undocumented Substack HTML and internal API drift. A credentialed but read-only GitHub Actions canary runs every six hours against a dedicated tester publication, emits a redacted receipt, and alerts configured incident channels when observed structures violate a reviewed contract.

## Functional requirements

- Probe the publication homepage without credentials and configured same-origin JSON endpoints with a tester cookie.
- Compare exact HTML markers and JSON field types against a repository-variable contract.
- Run on a six-hour schedule and by manual dispatch, with concurrency and timeout bounds.
- Alert Slack, Discord, and/or PagerDuty on failure.
- Preserve redacted evidence without response bodies, credentials, or automatically accepted baselines.

## Non-functional requirements

- Use `GET` only, restrict authenticated targets to HTTPS `substack.com` origins, reject redirects and oversized responses, and never target production publications.
- Unit-test drift detection, secret separation, target validation, and notification payloads without network access.
- Keep credentialed live execution outside pull-request CI.

## Acceptance criteria

- Deterministic tests pass locally and in required CI.
- The workflow syntax and pinned actions pass repository security checks.
- Setup and incident response are documented.
- GitHub issue hierarchy, Project #38, Conductor, PR checks, comments, merge, and cleanup receipts agree.

## Out of scope

- Publishing posts, creating drafts, mutating tester data, probing production accounts, scraping private content into artifacts, or automatically learning a new baseline.
