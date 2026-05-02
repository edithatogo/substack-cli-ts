---
title: "Formatting Examples"
subtitle: "Lists, quotes, code, and rules"
tags: [example, formatting, markdown]
audience: everyone
---

# Formatting Examples

This article covers common Markdown formatting patterns for Substack newsletters.

## Lists

### Unordered List

- First item
- Second item
- Third item
  - Nested item A
  - Nested item B
- Fourth item

### Ordered List

1. Step one
2. Step two
3. Step three
   1. Sub-step A
   2. Sub-step B
4. Step four

## Blockquotes

> This is a simple blockquote.

> Multi-paragraph blockquote:
>
> This is the second paragraph of the blockquote.
>
> > A nested blockquote for emphasis.

## Code

Here is some `inline code` within a paragraph.

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

```python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
```

A standalone code span: `const x = 42;`

## Horizontal Rules

---

Three dashes above.

***

Three asterisks above.

## Mixed Content

> A blockquote with a list inside:
>
> - Item one
> - Item two
>
> And a code block:
>
> ```
> echo "hello"
> ```
