# Track 10: API Media Upload

## Goal

Support image and media handling for internal API draft creation.

## Scope

- Upload local images.
- Preserve remote image URLs when acceptable.
- Capture alt text, captions, dimensions, and upload failures.
- Support captioned image nodes in the content payload.

## Dependencies

- Track 06 API Auth and Session Extraction.
- Track 09 API Content Payload Compatibility.

## Blocks

- Complete image parity in Track 02 Content Feature Parity.
- Reliable draft writes in Track 08 when Markdown includes local images.

## Acceptance Criteria

- Local image Markdown produces a Substack-hosted image URL or a clear failure.
- Captions and alt text survive draft creation.
- Media operations do not log local file contents or private URLs unnecessarily.
