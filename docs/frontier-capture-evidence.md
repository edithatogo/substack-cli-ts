# Frontier Capture Evidence

Capture evidence is for proving private or dashboard-only Substack surfaces before any status upgrade. It must stay redacted, minimized, and review-only.

## Fixture Contract

Use JSON fixtures with this shape:

```json
{
  "schemaVersion": 1,
  "capabilityId": "analytics-growth-revenue",
  "capturedAt": "2026-06-24T00:00:00.000Z",
  "source": "browser",
  "surface": "Dashboard analytics",
  "endpoints": [
    {
      "method": "GET",
      "url": "https://example.substack.com/api/v1/stats",
      "status": 200,
      "requestHeaders": { "accept": "application/json" },
      "responseHeaders": { "content-type": "application/json" },
      "responseBody": { "shape": { "opens": 1, "clicks": 1 } }
    }
  ],
  "notes": ["No private account data retained."]
}
```

The validator redacts cookies, authorization headers, bearer/basic tokens, long token-like values, UUID-like IDs, numeric/private path IDs, emails, private names, payment/tax/payout fields, subscriber/customer fields, and ID-like object keys. Arrays are capped and body previews are truncated so fixtures preserve contract shape instead of captured account data.

## Commands

Generate a capability-specific capture kit before collecting evidence:

```sh
node dist/cli.js coverage capture-kit --id analytics-growth-revenue
```

The kit prints the fixture template, redaction checklist, validation commands, manual runbook, and promotion blockers for the requested capability. It does not open a browser, read local credentials, or perform live Substack actions.

Validate and minimize a fixture:

```sh
node dist/cli.js coverage capture-validate --fixture fixtures/captures/analytics.json
```

Build a JSON inventory for drift comparison:

```sh
node dist/cli.js coverage capture-inventory \
  --fixture fixtures/captures/analytics.json fixtures/captures/video.json \
  --out fixtures/captures/endpoint-inventory.json
```

Render a human-readable inventory:

```sh
node dist/cli.js coverage capture-inventory \
  --fixture fixtures/captures/analytics.json \
  --format markdown
```

Compare two inventories:

```sh
node dist/cli.js coverage capture-diff \
  --before fixtures/captures/endpoint-inventory.previous.json \
  --after fixtures/captures/endpoint-inventory.json
```

Check whether conservative surfaces can graduate:

```sh
node dist/cli.js coverage capture-graduation \
  --inventory fixtures/captures/endpoint-inventory.json
```

## Graduation Rules

Probe-only, planning-only, and manual-admin capabilities must not graduate until they have:

- A redacted endpoint capture fixture in the inventory.
- An `endpoint-capture` evidence link in the coverage matrix.
- A `manual-check` evidence link for recovery or owner-approved manual validation.
- An active decision record that explains why the surface is still conservative until review.

Endpoint diffs are blocking by design. Added, removed, status-changed, hash-changed, or verification-time changes should be reviewed before updating the canonical inventory.

## Capture Kit Workflow

Use this sequence for every planning-only or probe-only frontier surface:

1. Run `coverage capture-kit --id <capability-id>` and review the generated manual runbook.
2. Capture against a test publication or owner-approved dashboard session.
3. Replace the generated fixture template with minimized request/response shape only.
4. Run the generated `capture-validate`, `capture-inventory`, `capture-graduation`, and `scan:secrets` commands.
5. Add endpoint-capture and manual-check evidence links before proposing any status promotion.

If the kit reports blockers that cannot be resolved without secrets, private subscriber data, payment/tax data, or unsupported app-only behavior, keep the surface conservative and update the decision record rather than automating it.
