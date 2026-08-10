# Risks T18-02

- Parser output changes could make a representation-specific case fail; the matrix should expose that drift before publication.
- A future transport adapter could serialize a different body shape; the payload assertion covers the current draft-write boundary.
- Live Substack behavior remains outside deterministic CI and requires the existing canary controls.

