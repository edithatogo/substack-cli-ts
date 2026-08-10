# Specification T18-02

The publishing pipeline must preserve a single canonical copy of title and subtitle metadata. Regression coverage must prove that normalization is retained through preparation, ProseMirror payload construction, and serialized draft-write request construction.

The matrix covers plain, formatted, and heading representations; title fallback; mismatches; and later body matches. Exact leading metadata is removable, while non-leading or non-matching content remains publishable body content.

