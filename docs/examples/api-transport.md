# Using the API Transport

The API transport publishes directly to Substack's internal API, bypassing the browser. This is faster and scriptable but requires valid authentication.

## Prerequisites

```bash
# Configure your publication
substack-cli config set-publication https://mynewsletter.substack.com

# Authenticate (extract cookies from local profile or use --auto-login)
substack-cli auth login --auto-login
```

## Create a draft via API

```bash
substack-cli draft my-post.md --transport api
```

## Validate the payload

Check what the CLI will send before creating a draft:

```bash
substack-cli api payload my-post.md
```

## Inspect draft API readiness

```bash
substack-cli api draft inspect my-post.md
```

## Publish via API

```bash
substack-cli publish my-post.md --transport api --yes
```

## Schedule via API

```bash
substack-cli schedule my-post.md --at 2026-06-15T10:00:00Z --transport api --yes
```

## Working with draft mappings

After drafting, check the local source-to-Substack mapping:

```bash
substack-cli api draft mappings
```

Link a file to an existing draft:

```bash
substack-cli api draft link my-post.md --draft-id 123456 --title "My Title"
```

## API inventory

```bash
# List drafts
substack-cli api inventory --draft-limit 20

# List recent posts
substack-cli api posts list --limit 5

# Show your profile
substack-cli api profile

# Show a public profile
substack-cli api profile --handle example-author
```

## Media upload

```bash
# Inspect the media manifest
substack-cli api media my-post.md
```

## Auth troubleshooting

```bash
# Check authentication source
substack-cli api auth status

# Force a specific auth source
substack-cli api auth status --source env
substack-cli api auth status --source local-profile
```
