import { describe, expect, it } from "vitest";
import { authorizePublicationSession } from "./authorized-session.js";
import { TrustedOriginPolicy } from "./origin-policy.js";
import { WorkspaceGuard } from "./workspace-guard.js";

describe("security boundaries", () => {
  it("allows only the configured publication and platform origins", () => {
    const policy = new TrustedOriginPolicy({ publicationOrigin: "https://example.substack.com" });
    expect(policy.isTrusted("https://example.substack.com/publish")).toBe(true);
    expect(policy.isTrusted("https://substack.com/api/v1/user")).toBe(true);
    expect(policy.isTrusted("http://example.substack.com/publish")).toBe(false);
    expect(policy.isTrusted("https://evil.example/publish")).toBe(false);
    expect(() =>
      policy.assertRedirect("https://example.substack.com", "https://evil.example"),
    ).toThrow();
    expect(policy.isTrusted("not-an-origin")).toBe(false);
    expect(() => policy.assertTrusted("https://evil.example")).toThrow(
      "Untrusted HTTPS origin: https://evil.example",
    );
    expect(() => policy.assertTrusted("not-an-origin")).toThrow();
  });

  it("rejects non-origin trusted policy configuration", () => {
    expect(() => new TrustedOriginPolicy({ publicationOrigin: "http://example.substack.com" })).toThrow();
    expect(() =>
      new TrustedOriginPolicy({ publicationOrigin: "https://example.substack.com/path" }),
    ).toThrow();
  });

  it("binds authorization to publication id and role", () => {
    expect(
      authorizePublicationSession({
        publicationId: 7,
        configuredPublicationId: 7,
        publicationOrigin: "https://example.substack.com",
        role: "admin",
      }).publicationId,
    ).toBe(7);
    expect(() =>
      authorizePublicationSession({
        publicationId: 8,
        configuredPublicationId: 7,
        publicationOrigin: "https://example.substack.com",
        role: "admin",
      }),
    ).toThrow();
    expect(() =>
      authorizePublicationSession({
        publicationId: 7,
        configuredPublicationId: 7,
        publicationOrigin: "https://example.substack.com",
        role: "viewer",
      }),
    ).toThrow();
    expect(() =>
      authorizePublicationSession({
        publicationId: 7.5,
        configuredPublicationId: 7,
        publicationOrigin: "https://example.substack.com",
        role: "admin",
      }),
    ).toThrow();
    expect(() =>
      authorizePublicationSession({
        publicationId: 7,
        configuredPublicationId: 7,
        publicationOrigin: "http://example.substack.com",
        role: "admin",
      }),
    ).toThrow();
  });

  it("rejects workspace escapes while allowing contained outputs", () => {
    const guard = new WorkspaceGuard("C:/workspace");
    expect(guard.assertWorkspaceInput("C:/workspace/posts/draft.md")).toContain("workspace");
    expect(guard.assertGeneratedOutput("C:/workspace/.state/receipt.json")).toContain(".state");
    expect(() => guard.assertWorkspaceInput("C:/workspace/../secrets.txt")).toThrow();
  });
});
