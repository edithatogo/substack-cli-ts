# Requirements T08-04

## Must
- The lifecycle canary MUST run only through manual workflow dispatch against a dedicated non-production publication.
- It MUST create uniquely marked content, reconcile it, revise it, unschedule it, and always attempt cleanup.
- It MUST emit a redacted receipt and classify ambiguous writes or cleanup as uncertain.
- Compatibility evidence MUST cover supported Node versions, operating systems, clients, and distribution formats without conflating repository, live-canary, and production evidence.

## Should
- The workflow SHOULD use a protected GitHub environment and explicit production-publication denylist.
- The lifecycle endpoint contract SHOULD remain owner-reviewed configuration because no stable public write API exists.

## Could
- Alerting COULD be added after the protected environment and destination are configured.

## Won't
- This track WILL NOT run write canaries on pull requests, schedules, or production publications.
- This track WILL NOT claim live registry or production-write compatibility without hosted evidence.
