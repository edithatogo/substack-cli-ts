🎯 **What:** The vulnerability fixed was a DOM-based XSS vulnerability in `src/publish/local-workflow.ts`, specifically inside the `fillBody` function where `document.execCommand("insertHTML", false, html)` was executing unsanitized HTML input.

⚠️ **Risk:** The potential impact if left unfixed is severe. A malicious actor controlling the markdown/HTML payload could inject `<script>` tags or malicious event handlers directly into the browser context evaluating the script, executing arbitrary JavaScript and leading to cross-site scripting (XSS). This could potentially hijack the user's browser session or leak sensitive data.

🛡️ **Solution:** The fix implements the `dompurify` library combined with `happy-dom` (since this script runs in a Node environment) to initialize a sanitizer. The `html` string is now sanitized via `DOMPurify.sanitize(html)` *before* it is passed to the Playwright context (`page.evaluate`) for evaluation and DOM insertion.
