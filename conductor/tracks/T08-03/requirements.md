# Requirements T08-03

## Must
- OpenTelemetry-compatible logs, metrics, and traces MUST be no-export by default and cover CLI, MCP, simulator, parser, state, and release scopes.
- Telemetry attributes MUST exclude secrets, content, paths, account identifiers, and arbitrary values.
- Benchmarks MUST cover TypeScript parallel controls, startup, parser, state, plan, simulator, and MCP catalogue.
- Budget regressions MUST fail CI and emit a machine-readable receipt.
- CPU, heap, and package-size profiles MUST be generated without publishing or live writes.

## Should
- Budgets SHOULD use stable, generous CI thresholds with explicit baseline rationale.
- Trend receipts SHOULD be retained as short-lived workflow artifacts.

## Could
- Host applications COULD register approved OpenTelemetry exporters after consent and retention review.

## Won't
- This track WILL NOT enable network telemetry by default or collect publication content, credentials, filenames, or user identifiers.
