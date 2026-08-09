# Requirements

## Must have

- **MUST-01 Immutable workflows:** Every third-party Action reference is pinned to a full commit SHA with a readable release annotation.
- **MUST-02 Workflow policy:** Actionlint and zizmor fail pull requests on invalid or unsafe workflow changes.
- **MUST-03 Vulnerability coverage:** CodeQL, dependency review, OSV, maintained secret scanning, npm audit, and npm signature checks run with least privilege.
- **MUST-04 Scorecard:** OpenSSF Scorecard publishes SARIF from a scheduled or default-branch run.
- **MUST-05 SBOMs:** Generate and validate SPDX 2.3 and CycloneDX 1.6 inventories with package relationships.
- **MUST-06 Licence policy:** Reject prohibited copyleft licences in production dependencies.
- **MUST-07 Reporting:** Private vulnerability reporting is enabled and documented as the preferred channel.
- **MUST-08 Threat model:** Cover credential exfiltration, SSRF, injection, traversal, confused deputy, replay, duplicate mutation, supply-chain compromise, PII leakage, and malicious repository content.
- **MUST-09 No false closure:** Keep runtime redaction and signed release attestations open until their owning tracks provide evidence.

## Should have

- **SHOULD-01 Minimal tokens:** Default workflow permissions are read-only; elevated permissions are job-local.
- **SHOULD-02 Machine evidence:** Upload SARIF and SBOM artifacts with explicit missing-file failure.

## Could have

- **COULD-01 Offline OSV mirror:** Add a pinned offline vulnerability database if network reliability requires it.

## Won't have in this increment

- Runtime redaction implementation, release provenance signing, dependency upgrades, or fuzz harnesses owned by other tracks.
