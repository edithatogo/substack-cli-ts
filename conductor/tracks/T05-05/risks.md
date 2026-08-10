# Risks T05-05

- **Duplicate mutation:** Never retry the HTTP request because persistence failed.
- **Lost cooldown:** Mutation callers fail closed when state cannot be made durable.
- **Misdiagnosis:** Preserve observed status and use a distinct typed error.
- **Sensitive evidence:** Error fields are bounded to channel, status, attempts, path, and cause; callers expose only the redacted message.
