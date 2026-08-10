# Requirements T18-02

## Must

- Add table-driven regression cases for plain, formatted, and heading metadata representations.
- Assert synchronized Markdown, HTML, and ProseMirror output after preparation.
- Assert the serialized publish payload does not reintroduce removed metadata.
- Preserve mismatch and later-body-match behavior.
- Keep the tests deterministic and independent of live credentials.

## Should

- Exercise title fallback when front matter does not provide a title.
- Keep the matrix easy to extend for future parser representations.

## Could

- Add fixture-backed cases for additional Markdown constructs.

## Won't

- Add fuzzy or semantic deletion of body content.
- Add live Substack calls to the regression suite.

