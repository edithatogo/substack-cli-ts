# T09-02 implementation ledger

- Verified current upstream action releases before pinning.
- Added immutable workflow policy, dependency review, OSV, and OpenSSF Scorecard jobs; retained GitHub CodeQL default setup as the sole CodeQL owner because GitHub rejects simultaneous advanced configuration.
- Added SPDX and CycloneDX generation/validation plus production licence and npm-signature policy.
- Documented the repository threat model and enabled private vulnerability-reporting route.
- Added trusted-publishing provenance and SPDX attestations, and verified the release artifact by checksum and GitHub attestation.
- Replaced partial secret masking with full structural redaction for explicit credentials, nested logger objects, bindings, URLs, and diagnostic text.
