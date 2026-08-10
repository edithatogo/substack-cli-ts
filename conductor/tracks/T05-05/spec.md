# Specification T05-05

## Overview

Separate successful HTTP observations from failures to persist local rate-limit state. Persistence failures must never be reported as transport failures or cause HTTP replay.

## Acceptance criteria

- A successful response followed by local persistence failure retains its observed HTTP status.
- Persistence receives a short bounded retry without repeating the HTTP request.
- Terminal persistence failure is typed, redacted, and preserves channel, status, attempts, and cause.
- Mutation paths fail closed with unknown outcome; read paths may report degraded persistence.
- Genuine network failure and HTTP 429 semantics remain distinct.

## Out of scope

- Retrying non-idempotent HTTP mutations.
- Best-effort persistence for mutation workflows.
- Changing upstream rate-limit policy.
