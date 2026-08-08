# Requirements

## Must have

- **MUST-01 Detection:** Detect HTTP 403 and bounded Cloudflare/browser-challenge fingerprints without retaining response bodies.
- **MUST-02 Safe default:** Return actionable browser-fallback guidance without launching a browser implicitly.
- **MUST-03 Read-only retry:** Allow exactly one explicit browser-assisted retry for GET/JSON reads and auth validation only.
- **MUST-04 Mutation isolation:** Never connect browser fallback to POST, PUT, DELETE, publish, schedule, or other mutation retries.
- **MUST-05 State capture:** Record standard Playwright storage state after authenticated local login and via an explicit refresh command.
- **MUST-06 Secret safety:** Store state only under ignored `.substack-cli/`, require a session cookie, use private file handling, and emit secret-free summaries.
- **MUST-07 Challenge interaction:** Default to a visible browser for new challenges; permit headless mode only as an explicit option for established profiles.
- **MUST-08 Deterministic assurance:** Test detection, fallback decisions, bounded retry, persistence, and redaction without live credentials.
- **MUST-09 Operations:** Document refresh, expiry, challenge triage, and prohibited use.
- **MUST-10 Traceability:** Link P15 #468, T15-01 #469, Project #38, Conductor, commit notes, PR, checks, comments, merge, and cleanup.
- **MUST-11 Small PR cadence:** Deliver and close this capability as an independent green PR.
- **MUST-12 Proactive blockers:** Self-address repository failures while preserving browser/login credentials and manual challenge completion as external gates.

## Should have

- **SHOULD-01 Existing dependency:** Reuse the maintained `playwright-core` dependency and local Chrome profile instead of adding Puppeteer.
- **SHOULD-02 Expiry metadata:** Report earliest cookie expiry without reporting names or values.
- **SHOULD-03 Atomic replacement:** Write state through a private temporary file before replacement.

## Could have

- **COULD-01 OS keychain:** Encrypt local state with an operating-system credential store in a later track.
- **COULD-02 Browserbase export:** Support remote-session state export after a separate threat model and explicit consent flow.

## Won't have in this track

- Challenge bypass, CAPTCHA solving, CI login automation, committed fixtures with real cookies, automatic writes, or mandatory second-person approval.
