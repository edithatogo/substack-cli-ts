# Verification Evidence: T19-01 Published-post editor schema compatibility and crash containment

## Summary

Track T19-01 addresses and contains Substack published-post and draft edit-screen failures:
1. **Primary Editor tableHeader Incompatibility:** Substack primary editor rejects ProseMirror \`tableHeader\` nodes with \`RangeError: Unknown node type: tableHeader\`.
2. **Auxiliary Editor Rich Block Incompatibility:** Substack secondary/published editor rejects rich blocks (headings, images, blockquotes, lists) with \`[tiptap error]: Invalid JSON content\` and alert \`Something has gone wrong. Please refresh the page and try again.\`.

## Evidence

### 1. Privacy-Safe Frozen Fixtures (\`fixtures/prosemirror/editor-compatibility/\`)
- \`cover-control.json\`: 0 tables, 0 tableHeaders (paragraph-only control; passes all editors).
- \`rich-pilot-control.json\`: 0 tables, rich nodes (heading, image, blockquote, lists; reproduction of post 210551946).
- Six scheduled essay fixtures with primary-editor tableHeader incompatibilities:
  - \`me-001-tables.json\`: 2 tables, 7 tableHeader nodes (4 + 3)
  - \`me-002-tables.json\`: 2 tables, 7 tableHeader nodes (4 + 3)
  - \`me-003-tables.json\`: 1 table, 4 tableHeader nodes (4)
  - \`me-004-tables.json\`: 1 table, 4 tableHeader nodes (4)
  - \`me-005-tables.json\`: 2 tables, 8 tableHeader nodes (4 + 4)
  - \`me-006-tables.json\`: 3 tables, 11 tableHeader nodes (4 + 4 + 3)
  - **Total:** 11 tables, 41 tableHeader nodes across the Season 1 corpus.

### 2. Static Analyzer & Five Independent Facets (\`src/editor-compatibility/\`)
- Independent assessment across 5 distinct facets:
  - \`publicRender\`: supported
  - \`storedBodyRoundTrip\`: valid JSON
  - \`primaryEditor\`: compatible vs incompatible (hard stop on \`tableHeader\`)
  - \`auxiliaryEditor\`: none/low/high risk (warns on headings, images, blockquotes, lists)
  - \`browserVerification\`: verified / failed / unverified
- Exact JSON paths reported for every incompatible node.
- Metrics evaluate node count, deepest depth, and duplicate editor mounting detection.

### 3. Operational Contingencies
- \`normalizeTablesToAccessibleLists\`: Converts table structures to accessible labelled bullet lists (\`Header: Value\`), removing all 41 \`tableHeader\` nodes while preserving text content.
- CLI-only update-in-place documented and recommended when auxiliary editor risk is present.

### 4. Disposable Canary & Minimal Upstream Escalation Package
- \`runDisposableEditorCanary\`: Enforces no-email, no-publication, isolated-scope invariants and records cleanup/restoration receipts.
- \`generateMinimalUpstreamReproductionPackage\`: Synthesizes self-contained privacy-safe reproduction package for Substack engineers without private content.

### 5. CLI Integration
- Added \`schema compatibility <file> [--normalize-tables] [--upstream-repro <dir>]\`.
- Integrated with \`prepublish\` and \`inspect\` reporting.
