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

## Current Progress

- Added a custom `image` ProseMirror node to preserve image source, alt text, title, and caption metadata.
- Added media manifest extraction from parsed Markdown so local and remote assets can be inspected before upload.
- Added `substack-cli api media <file>` to print a sanitized media manifest without dumping raw URLs or file contents.
- Added `uploadImage()` to `client.ts` — sends multipart POST with image file to Substack's upload endpoint (default: `/api/v1/image/upload`), extracts URL from response.
- Added `uploadDraftMedia()` to `src/substack-api/media-upload.ts` — extracts local images from ProseMirror document, uploads each, replaces `src` URLs with hosted URLs, returns updated document and upload report.
- Wired image upload into `executeDraftWrite()` — local images are uploaded and URL-replaced in the ProseMirror body before the draft is POSTed/PUT to Substack.
- Upload report included in `DraftWriteResult` (mediaUploaded, mediaFailed, mediaDetails).

## Implemented (via Track 10 parallel work, May 2026)

The `uploadDraftMedia()` function was a stub (empty file) despite being listed in Current Progress. **Critical fix applied:**
- Implemented full `uploadDraftMedia()` in `media-upload.ts` (148 lines) — walks ProseMirror doc, validates extensions, checks file existence, uploads via `uploadImage()`, returns updated doc + report.
- Exports: `MediaUploadOptions`, `UploadDraftMediaResult`, `DraftMediaReport`, `DraftMediaAssetResult`.
- Created `examples/media-test.md` — 10 image nodes (7 local, 2 remote, 1 no-alt) for future E2E validation.
- Previously failing media upload tests now pass.

## Completed

1. ✅ Custom `image` ProseMirror node preserves src, alt, title, caption.
2. ✅ Media manifest extraction from parsed Markdown (`src/parser/media.ts`).
3. ✅ `substack-cli api media <file>` command for sanitized media inspection.
4. ✅ `uploadImage()` in `client.ts` sends multipart POST with image file.
5. ✅ `uploadDraftMedia()` in `media-upload.ts` orchestrates upload and URL replacement (fully implemented from stub).
6. ✅ Image upload wired into `executeDraftWrite()` — local images uploaded before draft POST/PUT.
7. ✅ Upload report included in `DraftWriteResult` (mediaUploaded, mediaFailed, mediaDetails).
8. ✅ **File existence validation** — missing local images fail cleanly with "File not found" before upload attempt.
9. ✅ **Format validation** — non-image extensions (.pdf, .doc, etc.) are rejected before upload with clear error listing allowed formats.
10. ✅ **Configurable upload endpoint** via `SUBSTACK_UPLOAD_ENDPOINT` env var.
11. ✅ **Configurable response URL field** via `SUBSTACK_UPLOAD_RESPONSE_FIELD` env var (overrides default field search order: `url` → `data` → `image_url`).
12. ✅ 4 new tests covering: no-op (remote images), unsupported format, missing file, successful upload with URL replacement.
13. ✅ `examples/media-test.md` fixture created for E2E validation.

## Live E2E Validation Result (May 2026)

✅ **Image upload E2E validated** against live Substack at `https://rareinsights.substack.com/` using `examples/media-test.md`:

- **6 images uploaded, 0 failed** — all local images in the test file were uploaded successfully
- **Draft created**: ID `196195092` at the Substack editor
- **URLs replaced**: Local file paths were replaced with Substack-hosted URLs in the ProseMirror body

### Critical Bug Found and Fixed

The `uploadImage()` function in `src/substack-api/client.ts` was sending images as **multipart FormData** (`FormData.append("file"/"image", blob)`), but the Substack API expects **base64 data URLs in a JSON body**.

**Fix**: Changed from `FormData` to `JSON.stringify({image: "data:image/png;base64,..."})`. Added `mimeTypeForExt()` helper for proper MIME type detection (PNG, JPG, GIF, WebP, SVG). Removed unused `Blob`/`FormData` imports.

## Completed Work

- Track 10 implementation is fully complete and validated end-to-end.
