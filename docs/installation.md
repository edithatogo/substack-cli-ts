# Installation

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** (comes with Node.js)
- **Git** (for development setup)

### Optional

- **Google Chrome** — Required for `config set-runtime local` (local browser automation)
- **Browserbase account** — Required for `config set-runtime browserbase` (remote browser sessions)
- **Substack account** — With publish access to your publication

---

## Global Install (Recommended)

```bash
npm install -g substack-cli
```

Verify installation:

```bash
substack-cli --version
substack-cli --help
```

---

## Run Without Installing

```bash
npx substack-cli inspect examples/basic.md
```

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/edithatogo/substack-cli-ts.git
cd substack-cli-ts

# Install dependencies (omit optional Camoufox packages on Windows)
npm install --omit=optional

# Build TypeScript
npm run build

# Verify
node dist/cli.js --version
```

---

## Shell Completion

Generate shell completion scripts for your shell:

```bash
# Bash
source <(substack-cli completion bash)

# Zsh
source <(substack-cli completion zsh)

# PowerShell
substack-cli completion powershell | Out-String | Invoke-Expression
```

For persistent setup, add the appropriate line to your shell profile (`~/.bashrc`, `~/.zshrc`, or `$PROFILE`).

---

## Configuration

After installation, configure your publication:

```bash
# Set your publication URL
substack-cli config set-publication https://yourpub.substack.com

# View configuration
substack-cli config show
```

---

## Next Steps

- [Quick Start](examples/basic-workflow.md) — Create your first draft
- [Configuration](examples/configuration.md) — Detailed configuration guide
- [API Transport](examples/api-transport.md) — Set up API publishing
