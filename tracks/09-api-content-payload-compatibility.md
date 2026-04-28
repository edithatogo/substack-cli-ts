# Track 09: API Content Payload Compatibility

## Goal

Translate the existing Markdown/Tiptap pipeline into the payload shape expected by Substack's internal draft endpoints.

## Scope

- Reconcile existing ProseMirror/Tiptap output with ma2za-style post nodes.
- Support title, subtitle, slug, tags, audience, comment permissions, and section metadata.
- Add compatibility tests for paragraphs, headings, marks, links, lists, code blocks, blockquotes, horizontal rules, paywall, embeds, and captions.
- Document unsupported blocks and fallbacks.

## Dependencies

- Existing Track 01 Editor Schema Mapping.
- Existing Track 02 Content Feature Parity.

## Blocks

- Track 08 API Draft Write Model.
- Track 10 API Media Upload for captioned image payloads.
- Track 11 API Prepublish, Publish, and Schedule.

## Acceptance Criteria

- Fixture tests validate generated payloads without network access.
- Unsupported content fails before any write request.
- Browser and API transports share the same parsed source model.
