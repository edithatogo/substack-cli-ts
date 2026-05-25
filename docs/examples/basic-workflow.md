# Basic Workflow: Draft, Review, and Publish

## Prerequisites

- Install: `npm install -g @edithatogo/substack-cli`
- Configure: `substack-cli config set-publication https://your.substack.com`
- Auth: `substack-cli auth login`

## 1. Create a draft

```bash
substack-cli draft my-post.md
```

## 2. Inspect the parsed content

```bash
substack-cli inspect my-post.md
```

## 3. Preview with prepublish

```bash
substack-cli prepublish my-post.md
```

## 4. Publish

```bash
substack-cli publish my-post.md --yes
```

## 5. Full publish with dry-run first

```bash
substack-cli publish my-post.md --dry-run
# Review the output, then:
substack-cli publish my-post.md --yes
```

## Scheduling

```bash
substack-cli schedule my-post.md --at 2026-06-01T14:00:00Z --yes
```

## Using transports

```bash
# Browser automation (default — handles CAPTCHA, human review)
substack-cli publish my-post.md --transport browser

# Direct internal API (faster, scriptable)
substack-cli publish my-post.md --transport api

# Automatic fallback (browser first, then API)
substack-cli publish my-post.md --transport auto
```
