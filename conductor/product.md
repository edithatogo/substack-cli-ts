# Product

Repository: substack-cli-ts
Plan hash: f549b29a92f6549798d24d977f79face381dbc23d4e20c0c6b243bc36c46c344

## Mission
Create and then execute a contract-first, Conductor-managed, GitHub-tracked programme that migrates substack-cli-ts to a bleeding-edge mainline architecture, resolves all identified correctness/security/quality issues, matures the CLI, library and MCP server, publishes it broadly, and brings it to a defensible 1.0 with a long-term roadmap.

## Mandatory decisions
- global: The first run is planning-only and must stop after a green planning PR so the plan can be reviewed before implementation.
- global: Do not create or retain an experimental dependency lane. Bleeding-edge dependencies and relevant experimental features must live in mainline and pass normal required CI.
- global: Use the newest maintained upstream prerelease/canary/nightly/next/beta/rc/alpha dependency where available; otherwise use newest stable. Pin exact resolved versions.
- global: Create a canonical contract derived from this prompt and enforce it automatically.
- global: Use Conductor phases, tracks, plans and tasks, cross-referenced bidirectionally to a native nested GitHub issue hierarchy.
- global: Reuse existing issues and work rather than duplicating them.
- global: Keep the project local-first, contract-first, safe for autonomous agents, and operable by one maintainer.
- global: Do not perform exploratory live writes or claim external submissions that were not verified.
- global: Interpret 'glamira' as Glama unless refreshed research identifies a distinct intended registry.
