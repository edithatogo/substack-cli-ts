# Gemini MCP Integration

Gemini CLI supports MCP servers through its settings file. Use the package launch command so the integration works without a local repository checkout.

Canonical launch command: `npx -y @edithatogo/substack-cli mcp serve`

## Settings example

This repository includes `.gemini/settings.json` as a project-level example. Add the server to the Gemini settings file:

```json
{
  "mcpServers": {
    "substack-cli": {
      "command": "npx",
      "args": ["-y", "@edithatogo/substack-cli", "mcp", "serve"],
      "env": {
        "SUBSTACK_PUBLICATION_URL": "https://your-publication.substack.com"
      }
    }
  }
}
```

## Notes

- Validate against the installed Gemini CLI version because the client-side settings location and helper commands can change.
- Keep credentials in local environment variables or ignored local config only.
- Consumer Gemini web surfaces are a separate product path; this integration targets Gemini CLI or MCP-compatible local agents.
