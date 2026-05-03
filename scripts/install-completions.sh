#!/bin/bash
# Install shell completions for substack-cli
# Usage: source scripts/install-completions.sh

if [ -n "$ZSH_VERSION" ]; then
  # Zsh completion
  substack-cli completion zsh > /dev/null 2>&1
  if command -v substack-cli &> /dev/null; then
    source <(substack-cli completion zsh)
  fi
elif [ -n "$BASH_VERSION" ]; then
  # Bash completion
  if command -v substack-cli &> /dev/null; then
    source <(substack-cli completion bash)
  fi
fi
