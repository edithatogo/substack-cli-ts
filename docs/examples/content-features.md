# Supported Content Features

This document showcases every Markdown feature supported by substack-cli, with the Markdown source and its resulting behavior.

## Front Matter

Metadata for your post is defined in YAML front matter at the top of every Markdown file:

```markdown
---
title: "My Newsletter Post"
subtitle: "A brief summary for the post header"
tags: [technology, writing, tutorial]
audience: everyone
section: my-section-slug
---
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | yes | Post title displayed in the header |
| `subtitle` | no | Subtitle shown below the title |
| `tags` | no | Comma-separated tags for categorization |
| `audience` | no | `everyone` (default) or `only_free` or `only_paid` |
| `section` | no | Slug of the Substack section for this post |

## Text Formatting

```markdown
**Bold text** and *italic text* and ~~strikethrough~~.

Inline `code` for technical terms.
```

**Bold text** and *italic text* and ~~strikethrough~~.

Inline `code` for technical terms.

## Links

```markdown
[Visible link text](https://example.com)

Auto-linked URLs like https://substack.com are also detected.
```

## Images

```markdown
![Alt text for accessibility](https://example.com/photo.jpg)

![Image with caption](https://example.com/team.png "Our team in 2026")

![Local asset](./assets/logo.png)

<img src="https://example.com/product.jpg" alt="Screenshot" data-caption="Custom caption via HTML attribute">
```

## Lists

```markdown
### Unordered
- Item one
- Item two
  - Nested item A
  - Nested item B

### Ordered
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
```

## Blockquotes

```markdown
> A simple blockquote.

> Multi-paragraph:
>
> Second paragraph of the quote.
>
> > Nested blockquote for emphasis.
```

## Code Blocks

````markdown
Inline: `const x = 42;`

Fenced block with language:

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```
````

## Horizontal Rules

```markdown
---

***
```

## Tables (GFM)

```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| Draft   | ✅     | Via browser or API |
| Publish | ✅     | With confirmation gate |
| Schedule| ✅     | ISO timestamp required |

| Left-aligned | Center | Right-aligned |
|:-------------|:------:|--------------:|
| Text         | Text   | Text          |
```

## Substack Custom Markers

### Paywall Divider

Inserts a Substack paywall splitter. Content below the divider is for paid subscribers only:

```markdown
{{paywall}}
```

### Subscribe Widget

Adds a subscribe call-to-action with a custom label:

```markdown
{{subscribe: Enjoying this? Subscribe for more!}}
```

### YouTube Embed

Embeds a YouTube video with the standard Substack player:

```markdown
{{youtube: https://www.youtube.com/watch?v=dQw4w9WgXcQ}}
{{youtube: https://youtu.be/abcdefg}}
```

### Generic URL Embed

Creates a link embed with a preview card when Substack supports the domain:

```markdown
{{embed: https://example.com/article}}
```

### Podcast Embed

Embeds a podcast player from supported platforms (Spotify, Apple, etc.):

```markdown
{{podcast: https://open.spotify.com/episode/12345}}
```

## Complete Example

```markdown
---
title: "Everything You Can Do"
subtitle: "A tour of all supported Markdown features"
tags: [demo, features, markdown]
audience: everyone
---

# Welcome

This is a **demonstration** of everything substack-cli supports.

## Text

*Italic*, **bold**, `code`, and [links](https://example.com).

## Images

![Example](https://example.com/image.png "Optional caption")

## Lists

- Bullet one
- Bullet two

1. Numbered one
2. Numbered two

> A blockquote for emphasis.

## Code

```typescript
const msg: string = "Hello, Substack!";
```

## Table

| Key | Value |
|-----|-------|
| Name | substack-cli |
| Type | TypeScript CLI |

## Substack Features

{{paywall}}

{{subscribe: Like what you see? Subscribe!}}

{{youtube: https://www.youtube.com/watch?v=dQw4w9WgXcQ}}
```
