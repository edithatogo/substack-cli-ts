# Design T18-02

```mermaid
flowchart LR
  A["Markdown case matrix"] --> B["Shared preparePost boundary"]
  B --> C["Markdown / HTML / ProseMirror assertions"]
  C --> D["buildSubstackDraftPayload"]
  D --> E["Serialized draft-write body assertion"]
  E --> F{"Metadata absent from body?"}
  F -->|Yes| G["Regression passes"]
  F -->|No| H["Regression fails"]
```

The tests intentionally inspect each representation rather than only checking a final rendered string. This prevents a later transport adapter from reintroducing a defect already fixed at preparation time.

