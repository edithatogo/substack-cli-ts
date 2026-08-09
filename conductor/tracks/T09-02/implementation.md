# T09-02 implementation ledger

- Verified current upstream action releases before pinning.
- Added immutable workflow policy, dependency review, OSV, and OpenSSF Scorecard jobs; retained GitHub CodeQL default setup as the sole CodeQL owner because GitHub rejects simultaneous advanced configuration.
- Added SPDX and CycloneDX generation/validation plus production licence and npm-signature policy.
- Documented the repository threat model and enabled private vulnerability-reporting route.
- Deferred structural runtime redaction and release signing to their owning tracks without marking T09-02 complete.
