# Privacy-preserving observability

The library exposes OpenTelemetry-compatible traces and metrics for `cli`, `mcp`, `simulator`, `parser`, `state`, and `release` operations. OpenTelemetry API providers are no-op by default, so the CLI performs no network export and creates no telemetry file unless a host application explicitly registers providers and sets `SUBSTACK_TELEMETRY_EXPORT=host-provider`.

Only bounded operational attributes are accepted: `operation`, `outcome`, `format`, `mode`, and `component`. Cookies, authorization, content, filenames, paths, publication identifiers, email addresses, payloads, and arbitrary attributes are dropped.

Host applications remain responsible for exporter configuration, endpoint security, retention, sampling, consent, and regional privacy requirements. Do not register an exporter in shared CLI code or enable telemetry implicitly.
