# Substack Project Feature Matrix

Reviewed: 2026-04-28

## Decision Summary

No reviewed project fully matches the target approach: a TypeScript CLI that publishes local Markdown through a local, authenticated browser/editor workflow with manual review and CAPTCHA-safe login. Several projects are useful references, especially for feature inventory and Substack document node names, but most rely on undocumented internal APIs, copied session cookies, or direct publish endpoints.

Recommendation: continue this project, but borrow the feature checklist from the strongest existing projects. Do not replace the current browser-first architecture unless a maintained project proves reliable against the current Substack editor and authentication flow.

## Matrix

| Project | Language | Primary Interface | Create Draft | Update Draft | Publish | Schedule | Markdown | Images | Auth Model | Fit for This Project |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `jakub-k-slys/substack-api` | TypeScript | Library over undocumented/internal API | Yes | Not clear from docs | Yes | Not evident | HTML body examples, not full local Markdown pipeline | Not clear from docs | `substack.sid` / `connect.sid` cookie token | Strongest TypeScript option for broad read/write access: profiles, posts, notes, comments, likes, follows, analytics-style reads. Good candidate to test before building more direct API logic. |
| `vznh/substack` | TypeScript | SDK over unofficial read APIs | No | No | No | No | No | No | No API key required for documented examples | Good lightweight read-side TypeScript reference for posts, podcasts, recommendations, authors, profiles, subscriptions, and search. Not a publishing replacement. |
| `marcomoauro/substack-mcp` | JavaScript | MCP over internal API | Yes | Not evident | Not evident | Not evident | Body string only in README | Not evident | Session token, publication URL, user ID | Useful minimal MCP reference; not enough to replace this CLI. |
| `conorbronsdon/substack-mcp` | TypeScript | MCP over internal API | Yes | Yes | No long-form publish by design | No | Yes: headings, marks, links, images, lists, code, quotes, HR | Yes | `connect.sid`, publication URL, user ID | Strongest TypeScript reference for draft/update/image features, but intentionally avoids publish/schedule and uses cookie API calls. |
| `adelaidasofia/substack-mcp` | Unknown from public page | MCP | Unclear | Unclear | Unclear | Unclear | Unclear | Unclear | Unclear | Needs source review if reachable; not enough public evidence to influence direction yet. |
| `mcpflow/substack-mcp` | Python | MCP wrapper around `substack-api` | No | No | No | No | No | No | Mostly public/unofficial API | Read-only research aid only. |
| `NHagar/substack_api` | Python | Library + CLI over unofficial API | No | No | No | No | No posting path | Read content only | Optional user cookies for paywalled read access | Excellent read-side map: posts, podcasts, recommendations, categories, users, redirects, caching. Not a publishing replacement. |
| `matthagy/substack_client` | Python | Prototype REST client | No | No | No | No | No | No | Unauthenticated/internal REST | Historical endpoint map for posts/comments only. Not a publishing replacement. |
| `ma2za/python-substack` | Python | Library + MCP over internal API | Yes | Yes | Yes | Not evident | Yes | Yes, including local upload | Email/password or cookies | Most complete "information in and out" reference among reviewed projects. It covers Markdown import, images, sections, tags, draft update, prepublish, publish, and MCP tools, but it uses direct internal API calls. |
| Official Substack Developer API | HTTP API | Public read-only endpoint | No | No | No | No | No | No | Approved API access | Confirms there is no official write API for this use case. |
| `substackapi.dev` / similar services | Third-party API | Cached read API | No | No | No | No | No | No | Third-party API key | Useful only for read-side validation or migration tooling. |

## Feature Inventory To Import

The external projects suggest these feature tracks should be explicit:

- Draft metadata: subtitle, slug, tags, SEO title, SEO description, audience, comment permissions, section selection.
- Draft lifecycle: create draft, update draft, list drafts, fetch draft, duplicate detection, draft URL capture.
- Content blocks: paragraphs, headings, bold, italic, inline code, links, images, lists, code blocks, blockquotes, horizontal rules, paywall, captioned images, embedded publications.
- Media: upload local image, use remote image URL, preserve alt text and captions.
- Publication context: primary publication, multiple publications, section IDs, custom domains.
- Read-side diagnostics: subscriber count, published posts, comments, recommendations, authors, redirects after renamed handles/publications.
- Safety boundaries: no destructive delete, no silent publish, explicit confirmation for publish/schedule, no CAPTCHA solving.

## Source Notes

- `marcomoauro/substack-mcp`: README exposes `create_draft_post` with title/subtitle/body and requires session token, publication URL, and user ID. Source: https://github.com/marcomoauro/substack-mcp
- `vznh/substack`: README describes an unofficial TypeScript SDK for retrieving newsletter posts, podcasts, recommendations, user profiles, subscriptions, post content, metadata, and search results. Source: https://github.com/vznh/substack
- `conorbronsdon/substack-mcp`: README lists read tools, draft create/update, image upload, notes, and explicitly excludes long-form publish/delete/schedule. Source: https://github.com/conorbronsdon/substack-mcp
- `mcpflow/substack-mcp`: README describes read-only newsletter/post/search/author/recommendation tools via `substack-api`. Source: https://github.com/mcpflow/substack-mcp
- `NHagar/substack_api`: docs cover newsletter posts, podcasts, recommendations, user subscriptions, paywalled content via cookies, categories, caching, and redirect handling. Sources: https://github.com/NHagar/substack_api and https://www.nickhagar.net/substack_api/
- `jakub-k-slys/substack-api`: README and docs describe a TypeScript entity client for profiles, publications, posts, comments, notes, follows, likes, content creation, async pagination, caching, and cookie authentication. Sources: https://github.com/jakub-k-slys/substack-api and https://substack-api.readthedocs.io/
- `matthagy/substack_client`: README describes a prototype for frontend REST API access to posts/comments and warns that the non-documented API can break at any time. Source: https://github.com/matthagy/substack_client
- `ma2za/python-substack`: README documents email/password or cookie auth, draft creation, Markdown import, paywall nodes, captioned images, embedded publications, sections, prepublish, publish, tags, and MCP tools. Source: https://github.com/ma2za/python-substack
- Official Substack Developer API: read-only public profile lookup via LinkedIn handle; no write access. Source: https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API

## Recommended Next Step

If the objective is simply the best practical way to move information in and out of Substack, run a small evaluation of `ma2za/python-substack` and `jakub-k-slys/substack-api` before expanding this custom CLI. If they work against the target account today, they may cover more of the read/write surface faster than browser automation. Keep this CLI as the safer browser-editor fallback for draft creation and for cases where direct internal endpoints fail.
