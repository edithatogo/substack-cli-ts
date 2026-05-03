# Debugging with Diagnostics and Traces

## Doctor Command

The `doctor` command performs a comprehensive health check of your local
configuration, transport readiness, and ignored runtime files:

```bash
substack-cli doctor
```

Example output (JSON diagnostic report):

```json
{
  "nodeVersion": "20.x",
  "configPublication": "https://mynewsletter.substack.com",
  "runtime": "local",
  "chromeProfile": "/path/to/.substack-cli/chrome-profile",
  "transportReady": true,
  "draftMappingsCount": 5,
  "errors": [],
  "warnings": []
}
```

## Policy Command

Review the repository distribution and dependency policy:

```bash
substack-cli policy
```

Exits with code 1 if there are policy violations (e.g., deprecated dependencies,
restricted licenses).

## Debug Commands

### Inspect a local page

Navigate to a URL and inspect visible elements (links, buttons, editor fields):

```bash
substack-cli debug local-page
substack-cli debug local-page https://mynewsletter.substack.com/publish
```

### Inspect publish screen

Connect to an existing draft URL and inspect the publish review screen:

```bash
substack-cli debug publish-screen https://substack.com/draft/123456
substack-cli debug publish-screen https://substack.com/draft/123456 --capture
```

### Inspect review overlay

```bash
substack-cli debug review-overlay https://substack.com/draft/123456
```

### Inspect schedule screen

```bash
substack-cli debug schedule-screen https://substack.com/draft/123456
```

## Trace Capture and Review

Browser workflow traces capture every step of the publish/schedule/draft
workflow for debugging and audit.

### Capture a trace during publish

```bash
substack-cli publish my-post.md --trace-out trace.json --yes
```

### Review a trace

```bash
substack-cli trace review trace.json
```

### Compare two traces

Compare an actual trace against an expected one (exits with code 1 if not equal):

```bash
substack-cli trace compare expected.json actual.json
```

### Normalize a trace fixture

Generate a normalized trace fixture for test comparisons:

```bash
substack-cli trace fixture trace.json --out fixture.json
```

## Draft Capture and Contract Inference

### Observe browser traffic while editing a draft manually

```bash
substack-cli api draft observe
substack-cli api draft observe https://substack.com/draft/123456 --timeout-seconds 120
```

### Infer API endpoints from a saved capture

```bash
substack-cli api draft contract capture.json
```

### Merge multiple captures into a contract matrix

```bash
substack-cli api draft contract-matrix capture1.json capture2.json --out matrix.json
substack-cli api draft contract-matrix-compare expected.json actual.json
```

## Schema Validation and Fixtures

### Validate a ProseMirror JSON file

```bash
substack-cli schema validate document.json
```

### Capture a schema fixture

```bash
substack-cli schema capture my-post.md --out fixtures/prosemirror/my-post.json
```

### Compare current output against a fixture

```bash
substack-cli schema compare my-post.md fixtures/prosemirror/my-post.json
```
