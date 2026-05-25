# Track 17: Publication Settings & Branding

## Goal

Enable programmatic management of Substack publication settings — branding, layout, SEO, and metadata — through the internal API, so that publication-wide configuration can be scripted and validated without the dashboard UI.

## Scope

- Update publication name, description, and hero text
- Upload or replace logo and favicon (reuse image upload infrastructure from Track 10)
- Configure color scheme, typography (heading/body fonts), and button styles
- Manage homepage layout: featured posts, section ordering, homepage design
- SEO: custom meta title, meta description, Open Graph tags, Twitter card image
- Navigation: custom links, page ordering, archive visibility
- Email branding: header/footer template colors and logo placement
- Read-modify-write cycle that fetches current settings, applies local overrides, and pushes only the diff

## Discovery Needed

- Identify the exact internal API endpoint(s) for publication settings — `POST /api/v1/publication/update` is a candidate; capture full request/response schema via browser DevTools network panel
- Map all fields in the Substack dashboard's "Publication settings" and "Brand" pages to API fields
- Determine whether settings updates are applied atomically or field-by-field (some endpoints may require full payload)
- Test logo upload: confirm whether it reuses the same `POST /api/v1/image/upload` endpoint or requires a different upload flow for favicon/logo
- Identify whether hex color values are accepted directly or mapped to a design system palette
- Check if navigation links are managed via a dedicated endpoint or embedded in the publication settings payload
- Confirm whether SEO fields (meta title, Open Graph) live on the publication object or are separate API resources
- Determine safe mutation boundaries: which fields can be changed without triggering re-approval or email notification

## Acceptance Criteria

- Publication name and description can be read and updated via `substack-cli api publication settings get` and `set`
- Logo upload produces a Substack-hosted URL and the publication reflects it on next page load
- Color and font settings can be applied from a YAML/JSON config file with validation
- All write operations perform a read-modify-write cycle to avoid overwriting concurrent changes
- No irreversible branding changes are committed without `--yes` confirmation
- Schema versions are validated before write to detect API drift
- Unknown or removed fields in the response do not cause data loss on write-back

## Dependencies

- Track 06 (API Auth and Session Extraction) — all write operations require authenticated sessions
- Track 10 (API Media Upload) — logo upload reuses or extends the `uploadImage()` infrastructure
- Track 07 (API Read Model) — current publication read path provides baseline `hero_text`, `name`, `subdomain` fields

## Status

**Complete**

**Implemented:**
- `api publication get` command — fetches full publication details via `fetchPublication()` with rich schema (name, subdomain, logo, favicon, colors, fonts, payments state)
- `api publication settings` command — exposes branding-specific fields (colors, fonts, logos)
- `api publication get-details` command — alias that returns raw `fetchPublicationSettings()` output
- `api publication set` command — read-modify-write cycle via `updatePublicationSettings()`
  - Supports `--from-json <file>` and `--from-yaml <file>` for batch updates
  - Supports individual CLI flags: `--name`, `--description`, `--hero-text`, `--logo-url`, `--favicon-url`, `--primary-color`, `--secondary-color`, `--background-color`, `--text-color`, `--font-heading`, `--font-body`, `--seo-title`, `--seo-description`, `--og-image-url`, `--email-header-color`, `--email-footer-color`
  - `--dry-run` previews diff without writing
  - `--yes` confirms irreversible changes
- `api publication upload-logo <file>` command — uploads image via `uploadPublicationLogo()` then updates `logo_url`
- `api publication upload-favicon <file>` command — uploads image via `uploadPublicationFavicon()` then updates `favicon_url`
- `api inventory` command includes publication details in composite output
- `src/substack-api/publication-settings.ts` module with:
  - `PublicationSettingsUpdateSchema` (zod) for validation
  - `fetchPublicationSettings()` — read endpoint reuse
  - `updatePublicationSettings()` — read-modify-write with diff preview
  - `uploadPublicationLogo()` / `uploadPublicationFavicon()` — image upload + setting update
  - `computeSettingsDiff()` — shallow diff for preview output
- `src/substack-api/publication-settings.test.ts` — 18 test cases covering fetch, update, preview, logo/favicon upload, diff, and edge cases

**Completed Work:**
- None. Track 17 is complete.
