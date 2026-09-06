# Specification T19-01

## Overview

Detect, explain and contain Substack published-post edit-screen failures caused by a mismatch between a rich post body and one or more editor schemas mounted by Substack. The CLI must distinguish public-render success, primary-editor compatibility, secondary-editor editability risk and authenticated live verification rather than collapsing them into one success state.

The motivating reproduction is published post `210551946`. Its public page and primary editor accept the body, while a second restricted Tiptap editor rejects `image`, `heading`, `blockquote` and list nodes and duplicates a large document tree. A separate control post demonstrates a primary-editor incompatibility for `tableHeader`.

## Functional requirements

1. Maintain versioned capability profiles for the full draft editor, the observed restricted auxiliary editor and the published-revision workflow.
2. Inventory every node and mark in a payload and report unsupported content with an exact JSON path, node type and affected target profile.
3. Model table incompatibility with the primary editor separately from auxiliary-editor incompatibility.
4. Extend create/update receipts to report public rendering, stored-body round trip, primary-editor compatibility, auxiliary-editor risk and authenticated browser verification independently.
5. Provide an authenticated disposable-canary workflow that observes editor schemas, Tiptap errors, DOM duplication, page stability and cleanup without publishing or emailing.
6. Preserve a documented CLI update-in-place contingency when the browser editor is unsafe.
7. Generate a privacy-safe minimal upstream reproduction fixture.

## Non-functional requirements

- Fail closed when a hard incompatibility would make the primary editor unable to represent the post.
- Do not silently delete or flatten rich content.
- Do not infer a supported auxiliary API representation until verified.
- Respect authentication expiry, shared rate limits, CAPTCHA/2FA and explicit confirmation boundaries.
- Keep diagnostics deterministic and free of credentials or article payloads.
- Record upstream schema versions or observed fingerprints so drift is detectable.

## Acceptance criteria

- A rich fixture passes the full profile and reports exact restricted-profile incompatibilities.
- A table fixture identifies `tableHeader` before a live write.
- Receipts keep public rendering, primary compatibility, auxiliary risk and live verification distinct.
- Canary runs cannot publish or email and have deterministic cleanup/restore receipts.
- Auth, rate-limit, upstream drift and cleanup failures stop safely.
- Documentation labels CLI-only editing as a contingency rather than a resolution.
- A minimal reproduction suitable for Substack escalation is generated without private content.

## Out of scope

- Reverse-engineering or claiming the purpose of Substack's secondary editor without evidence.
- Automatically stripping headings, images, quotations, lists or tables from user content.
- Changing the published Moral Economics post as part of this tool track.
- Runtime implementation during this planning-only invocation.
