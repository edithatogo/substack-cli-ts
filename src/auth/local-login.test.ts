import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isAuthenticationFailureUrl } from "./local-login.js";

describe("isAuthenticationFailureUrl", () => {
  it("detects sign-in and recovery URLs after auto-login submission", () => {
    assert.equal(isAuthenticationFailureUrl("https://substack.com/sign-in?redirect=%2F"), true);
    assert.equal(
      isAuthenticationFailureUrl("https://substack.com/account-recovery?email=a%40b.co"),
      true,
    );
    assert.equal(isAuthenticationFailureUrl("https://example.substack.com/p/test"), false);
  });

  it("treats malformed URLs as not conclusive", () => {
    assert.equal(isAuthenticationFailureUrl("not a url"), false);
  });
});
