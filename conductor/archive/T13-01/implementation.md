# Implementation ledger

| Work item | Evidence | State |
| --- | --- | --- |
| Track contract and test taxonomy | T13-01 spec, MoSCoW requirements, Mermaid design, plan, risks and contract map | Implemented and structurally validated |
| Deterministic modality suites | Test files, fixtures, scripts and taxonomy validation | Current remediation graph: 13 files/24 tests passed plus built-CLI e2e; clean `master` source run: 10 suites/16 assertions passed, with CDC import awaiting authoritative lockfile install |
| CI and one-command integration | `npm run test:assurance`, required workflow and hosted receipt | Implemented; hosted clean-install evidence pending PR |
| Credentialed canaries | Browser/model authorization, cost, data, cleanup and result receipts | External/manual gate |
| Small-PR and blocker operating rule | Bounded diff, green Actions/comments, remediation or external-blocker receipt | Active for T13-01 and subsequent track increments |

Closeout verified on 2026-08-09: PR #464 merged as `2662b3ccb254811177dbbd9419023b48de0dce17` with all available non-conditional checks green. Codecov confirmed full patch coverage; the Node 26 review warning was considered and rejected against successful hosted Node 26 evidence. The track is archived.
