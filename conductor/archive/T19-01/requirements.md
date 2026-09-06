# Requirements T19-01

## Required evidence

- Reproduction captures for published post `210551946`.
- Full-editor schema acceptance of the stored body.
- Restricted-editor errors for `image`, `heading`, `blockquote` and lists.
- Primary-editor `tableHeader` failure from a separate control fixture.
- Stored `draft_body` versus published `body` comparison.

## Decision record

Recommended approach: layered protection using deterministic static profiles, precise diagnostics, an authenticated disposable canary, fail-closed primary-editor checks, prominent auxiliary-editor risk, and CLI-only update as a contingency.

Alternatives retained for evaluation:

1. Normalize unsupported nodes only when an explicit, supported target representation exists.
2. Use an editor-native round trip for compatibility evidence.
3. Escalate a minimal reproduction upstream and retain local safeguards while awaiting resolution.

No alternative may silently weaken content fidelity or external-write confirmation gates.
