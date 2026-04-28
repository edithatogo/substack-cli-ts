# Track 05: External Project Research

## Goal

Use existing Substack and editor automation projects to identify hidden feature requirements, while keeping this project on a safe draft-first browser workflow.

## Initial Leads

- `jakub-k-slys/substack-api`: TypeScript client with entity models for profiles, posts, comments, notes, and connectivity checks.
- `jakub-k-slys/n8n-nodes-substack`: n8n integration exposing profile, post, note, and comment operations.
- `NHagar/substack_api`: Python client with newsletter, post, user, recommendations, podcast, authenticated content, and handle redirect concepts.
- `publish-substack-article` style workflows: browser automation using HTML clipboard paste into Substack's Tiptap editor.
- Tiptap and ProseMirror projects: schema, serialization, and editor behavior references.

## Reviewed Matrix

See `research/substack-project-matrix.md` for the current comparison of listed GitHub projects, Substack docs, and third-party API references.

## Research Questions

1. Which post metadata fields are commonly exposed by unofficial clients and should be supported locally?
2. Which content blocks are lost or degraded when using clipboard HTML paste?
3. How should updates, duplicated drafts, renamed publications, and redirects be handled?
4. Which Substack surfaces are read-only research aids versus write paths to avoid?
5. What fixture examples can be created without storing private content or session data?

## Next Tasks

1. Review source and docs for the initial leads and record feature inventory in this file. Done for the first matrix pass; continue with source-level review for the most relevant projects.
2. Convert useful findings into issues or tasks under tracks 01-04.
3. Add attribution links in `README.md` for design references where appropriate.
4. Avoid importing code from incompatible licenses or unstable endpoint wrappers.

## Acceptance Criteria

- Research produces a feature checklist, not a dependency on an unofficial API.
- Any adopted behavior is implemented through local parsing or browser editor interaction.
- Sources and rationale are documented for future maintainers.
