# Disposable publication canary

This manual-only workflow exercises create, reconcile, revise, unschedule, and cleanup against a dedicated non-production Substack publication. It is separate from the scheduled read-only API drift canary.

## Required protected environment

Create the GitHub environment `disposable-substack-canary`. Store `SUBSTACK_TEST_COOKIE` as an environment secret. Configure these environment variables:

- `SUBSTACK_DISPOSABLE_PUBLICATION_URL`: the dedicated `https://name.substack.com/` origin.
- `SUBSTACK_CANARY_PRODUCTION_URLS`: comma-separated production origins that must never be targeted.
- `SUBSTACK_DISPOSABLE_CONTRACT_JSON`: reviewed same-origin endpoint contract for create, reconcile, revise, unschedule, and cleanup.

The lifecycle contract is configuration because Substack does not publish a stable write API. Every non-create path must contain `{draftId}`. Methods are constrained by operation, and cleanup must use `DELETE`.

## Execution and recovery

Run `Disposable Publication Canary` manually and enter `RUN DISPOSABLE CANARY`. The unique run marker is included in all test content. Cleanup runs in `finally`; a network error, missing draft ID, failed reconciliation, or failed cleanup produces an `uncertain` receipt and a failed workflow.

If cleanup is uncertain, search the dedicated publication for the receipt marker and remove only that matching draft through the Substack dashboard. Never rerun blindly, point the workflow at a production publication, commit cookies or endpoint contracts, or weaken the manual-dispatch guard.
