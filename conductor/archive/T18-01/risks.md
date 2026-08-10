# Risks T18-01

- Over-broad deletion could remove legitimate editorial content; exact rendered-text equality and leading-position constraints mitigate this.
- Divergence between Markdown, HTML, and ProseMirror forms could affect validation; all three are normalized together and tested.
- Agent guidance alone is insufficient; the shared runtime boundary remains defensive.
