export class BrowserNotFoundError extends Error {
  constructor(message?: string) {
    super(message ?? "Chrome/Chromium binary not found");
    this.name = "BrowserNotFoundError";
  }
}

export class CaptchaDetectedError extends Error {
  readonly debugUrl?: string | undefined;

  constructor(debugUrl?: string | undefined) {
    const base = "CAPTCHA challenge page detected. Complete it manually";
    const url = debugUrl ? ` at ${debugUrl}` : "";
    super(`${base}${url}.`);
    this.name = "CaptchaDetectedError";
    this.debugUrl = debugUrl;
  }
}

export class SessionTimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? "Browser session timed out");
    this.name = "SessionTimeoutError";
  }
}

export class NavigationTimeoutError extends Error {
  constructor(message?: string) {
    super(message ?? "Page navigation timed out");
    this.name = "NavigationTimeoutError";
  }
}
