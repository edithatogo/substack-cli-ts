# Specification: Analytics And Revenue Dashboard Probe Coverage

## Overview

Keep analytics and revenue dashboard automation probe-only. The CLI should fetch available metrics, capture local snapshots, summarize trends, and report unsupported diagnostics without scraping or mutating dashboard-only views.

## Existing Implementations To Learn From

- Local: `src/substack-api/analytics.ts`, `src/substack-api/billing.ts`, and `src/creator/growth.ts`.
- Local: `analytics snapshot`, `analytics trend`, `growth report`, `api analytics`, and `api billing`.
- External: unofficial dashboards and MCP servers advertise analytics/export goals, but available safe contracts remain inconsistent.

## Implementation Options

- Option A: Keep existing analytics and billing probes only.
- Option B: Add safe-surface reporting that explains probe coverage, local snapshots, dashboard gaps, and manual capture requirements.
- Option C: Build a browser dashboard scraper.

Selected option: B. Dashboard scraping remains out of scope.

## Functional Requirements

- Expose analytics/revenue dashboard status as probe-only.
- List supported local alternatives: snapshots, trends, growth report, billing probes.
- Include manual dashboard capture requirements and unsupported operations.

## Acceptance Criteria

- `coverage safe-surface --id analytics-revenue-dashboards` reports probe-only status.
- Tests cover local alternatives and endpoint-capture prerequisites.

## Out Of Scope

- Scraping dashboard UI, changing payout settings, tax forms, payment tiers, or paid setup.
