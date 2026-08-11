# Design: Substack Markdown Publisher CLI

> **Last updated:** 2026-08-11
> **Status:** Living Document
> **Architecture Style:** Modular monolith with dual-transport (browser automation + HTTP API)

---

## 1. System Architecture

```mermaid
graph TB
    CLI[CLI Layer commander.js] --> CORE[Core Services]
    CLI --> MCP[MCP Server]

    subgraph CORE[Core Services]
        PARSER[Markdown Parser]
        PREP[Post Preparer]
        PREPUB[Prepublish Validator]
        POLICY[Policy Evaluator]
        DOCTOR[Doctor]
    end

    PARSER --> SCHEMA[Schema Fixtures]
    PREP --> API[API Transport]
    PREP --> BROWSER[Browser Automation]
    API --> SUBSTACK[Substack]
    BROWSER --> SUBSTACK
```

---

## 2. Data Flow: Draft to Publish

```mermaid
sequenceDiagram
    participant User
    participant CLI as CLI
    participant Prep as preparePost
    participant Parser as Markdown Parser
    participant API as API Transport
    participant Browser as Browser Automation
    participant Substack as Substack

    User->>CLI: draft post.md
    CLI->>Prep: preparePost
    Prep->>Parser: parseMarkdownFile
    Parser-->>Prep: ParsedPost

    alt transport api or auto
        CLI->>API: executeDraftWrite
        API->>Substack: POST /api/v1/drafts
        Substack-->>API: DraftResponse
    else transport browser
        CLI->>Browser: runBrowserWorkflow
        Note over Browser,Substack: Live publish/schedule requires --yes
    end

    CLI-->>User: JSON result
```

---

## 3. Module Dependency Graph

```mermaid
graph LR
    CLI[cli.ts] --> CONFIG[config/store.ts]
    CLI --> AUTH[auth]
    CLI --> BROWSER[browser]
    CLI --> PARSE[parser]
    CLI --> PUBLISH[publish]
    CLI --> SUB_API[substack-api]
    CLI --> MCP[mcp]
    CLI --> POLICY[policy]
    SUB_API --> CONFIG
    BROWSER --> CONFIG
    MCP --> SUB_API
    PUBLISH --> BROWSER
    PARSE --> PUBLISH
```

---

## 4. Security Architecture

```mermaid
graph TB
    ENV[.env] --> REDACT[redact helpers]
    PROFILE[Local Chrome profile] --> REDACT
    REDACT --> OUTPUT[CLI and MCP output]
    GIT[.gitignore] -->|excludes| ENV
    GIT -->|excludes| STATEDIR[.substack-cli]
```

Live publish and schedule stay fail-closed without `--yes`. Default CI never uses Substack credentials.

---

## 5. CI/CD Pipeline

```mermaid
graph LR
    PR[Pull Request] --> Q[Quality]
    PR --> Fuzz[Fuzz]
    PR --> Smoke[Smoke]
    PR --> Assure[Assurance taxonomy]
    PR --> Mut[Mutation]
    PR --> Sec[Security OSV review Scorecard on push]
    Q --> Codecov[Codecov informational on PRs]
```

Required merge checks are listed in `docs/ruleset-solo-maintainer.json`. Review count is 0.

---

## 6. Key Design Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| CLI | commander.js | Thin handlers over modules |
| Parser | marked + Tiptap | Markdown → HTML → ProseMirror |
| Browser | Playwright + Stagehand | Local or Browserbase |
| API | fetch + Zod | No extra HTTP client for first-party calls |
| Dual transport | `--transport browser\|api\|auto` | Auto can fall back |
| Auth | Cookie / env | No OAuth in-repo |
| Testing | Vitest, fast-check, Stryker | Taxonomy in `docs/quality-frontier.md` |
| Dependencies | Renovate | Dependabot PRs disabled |
| Reviews | 0 required | Solo maintainer; machines gate |
