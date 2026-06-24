# Starlight Documentation Site Setup

This guide explains how to deploy the substack-cli documentation using **Starlight** (the Astro-powered documentation framework).

---

## Quick Start

```bash
# Create a new Astro project with Starlight
npm create astro@latest substack-cli-docs -- --template starlight

# Copy the documentation content
cp -r /path/to/substack-cli/docs/* substack-cli-docs/src/content/docs/

# Install and run
cd substack-cli-docs
npm install
npm run dev
```

---

## Starlight Configuration

Create `astro.config.mjs` in the docs site root:

```js
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "substack-cli",
      description: "Publish local Markdown to Substack",
      logo: {
        src: "./src/assets/logo.svg",
      },
      social: {
        github: "https://github.com/edithatogo/substack-cli-ts",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", link: "/" },
            { label: "Quick Start", link: "/examples/basic-workflow/" },
            { label: "Installation", link: "/installation/" },
          ],
        },
        {
          label: "CLI Reference",
          autogenerate: { directory: "/api" },
        },
        {
          label: "Examples",
          autogenerate: { directory: "/examples" },
        },
        {
          label: "Architecture",
          autogenerate: { directory: "/api" },
        },
        {
          label: "Workflows",
          autogenerate: { directory: "/workflows" },
        },
        {
          label: "Decisions",
          autogenerate: { directory: "/decisions" },
        },
      ],
      components: {
        // Custom components for the docs
      },
    }),
  ],
});
```

---

## Content Structure

The documentation follows this structure for Starlight compatibility:

```
docs/
├── index.md                         # Home page
├── installation.md                  # Installation guide
├── _config.yml                      # Jekyll config (for GitHub Pages)
├── starlight-setup.md              # This file
├── feature-matrix.md               # Feature comparison
├── substack-feature-coverage.md    # Substack feature mapping
├── api/
│   ├── architecture.md             # System architecture
│   └── commands.md                 # CLI command reference
├── examples/
│   ├── basic-workflow.md           # Draft, publish, schedule
│   ├── api-transport.md            # API transport
│   ├── content-features.md         # Content features
│   ├── mcp-integration.md          # MCP integration
│   ├── configuration.md            # Configuration
│   └── diagnostics-and-traces.md   # Diagnostics
├── workflows/
│   ├── cli.md                      # CLI workflows
│   └── mcp.md                      # MCP workflows
└── decisions/
    ├── 0001-quality-toolchain.md   # Quality toolchain
    ├── 0002-transport-strategy.md  # Transport strategy
    ├── 0003-reusable-module-boundaries.md
    └── 0004-e2e-testing.md         # E2E testing strategy
```

---

## GitHub Pages Alternative

The `docs/` directory is also configured for GitHub Pages via Jekyll:

```yaml
# .github/workflows/pages.yml already configured to deploy docs/ to GitHub Pages
# Theme: jekyll-theme-cayman
```

---

## Custom Domain

For a custom docs domain, update `astro.config.mjs`:

```js
export default defineConfig({
  site: "https://docs.yourdomain.com",
  // ...
});
```

---

## Badges

Add these badges to the Starlight site header:

```markdown
[![npm version](https://img.shields.io/npm/v/@edithatogo/substack-cli.svg)](https://www.npmjs.com/package/@edithatogo/substack-cli)
[![CI](https://github.com/edithatogo/substack-cli-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/edithatogo/substack-cli-ts/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
```
