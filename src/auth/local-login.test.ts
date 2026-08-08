import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { isAuthenticationFailureUrl, isPasswordLoginLabel } from "./local-login.js";

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

describe("isPasswordLoginLabel", () => {
  it("accepts explicit password-login actions", () => {
    assert.equal(isPasswordLoginLabel("Sign in with password"), true);
    assert.equal(isPasswordLoginLabel("Use your password instead"), true);
    assert.equal(isPasswordLoginLabel("  Continue   with password  "), true);
  });

  it("rejects recovery and reset actions", () => {
    assert.equal(isPasswordLoginLabel("Forgot password?"), false);
    assert.equal(isPasswordLoginLabel("Reset password"), false);
    assert.equal(isPasswordLoginLabel("Recover account using password"), false);
  });
});
