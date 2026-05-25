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

## Completed Tasks

1. Reviewed source and docs for the initial leads and recorded the feature inventory in `research/substack-project-matrix.md`.
2. Converted useful findings into follow-up track work for parser, browser, and API transport behavior.
3. Added attribution and rationale in repository docs where external design references shaped implementation.
4. Avoided importing code from incompatible licenses or unstable endpoint wrappers.

## Acceptance Criteria

- Research produces a feature checklist, not a dependency on an unofficial API.
- Any adopted behavior is implemented through local parsing or browser editor interaction.
- Sources and rationale are documented for future maintainers.
