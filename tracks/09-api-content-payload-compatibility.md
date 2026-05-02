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

## Current Progress

- Added an API payload builder that reuses the existing parsed Markdown/Tiptap source model.
- Added metadata fields for `section`, `sectionId`, and `comments`.
- Added compatibility validation for supported ProseMirror nodes and marks before any write request.
- Added `substack-cli api payload <file>` for local payload inspection without network access.

## Completed

1. ✅ Payload builder (`buildSubstackDraftPayload`) handles all metadata: title, subtitle, slug, tags, audience, section, sectionId, comments.
2. ✅ Compatibility validation (`validatePayloadCompatibility`) checks all node/mark types before write.
3. ✅ Request body builder (`buildDraftWriteRequestBody`) produces create/update payloads matching the live captured Substack contract.
4. ✅ Contract validation tests verify create body keys (10 keys) and update body keys (9 keys) match the live `fixtures/drafts/live-draft-contract.json` capture.
5. ✅ `section_chosen` boolean correctly reflects whether `sectionId` is set.
6. ✅ Create body includes `audience` and `type`; update body includes `last_updated_at` — matching the live contract.
7. ✅ Unsupported content throws before any write request (tested).
8. ✅ Browser and API transports share the same parsed source model (both call `preparePost`/`parseMarkdownFile`).

## Remaining Work

- Image/embed/caption payload compatibility after media upload mapping exists (depends on Track 10).
- Expand unsupported fallback documentation once draft write probes identify exact endpoint requirements.
