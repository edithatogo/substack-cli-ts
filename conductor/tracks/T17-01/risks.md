# Risks

- User-owned Projects require broader tokens than repository issue reads; routine CI deliberately validates hierarchy only and relies on a hosted receipt for Project configuration.
- GitHub API latency can interrupt bulk repair; all creation is resumed from hosted state and keyed by unique issue numbers.
- Closing duplicate records can obscure history if deleted; this track detaches and closes them with explanatory comments instead.
- Future supplemental tracks can drift unless their manifest and native hierarchy are updated in the same PR.
