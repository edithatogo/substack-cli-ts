import { resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { WorkspaceGuard } from "./workspace-guard.js";

describe("WorkspaceGuard", () => {
  describe("initialization", () => {
    it("resolves the root path", () => {
      const guard = new WorkspaceGuard("some/relative/path");
      expect(guard.root).toBe(resolve("some/relative/path"));
    });
  });

  describe("assertInside", () => {
    const root = resolve("/fake/workspace");
    const guard = new WorkspaceGuard(root);

    it("allows paths inside the workspace", () => {
      const validPath = resolve("/fake/workspace/file.txt");
      expect(guard.assertInside(validPath)).toBe(resolve(validPath));
    });

    it("allows the root path itself", () => {
      const rootPath = resolve("/fake/workspace");
      expect(guard.assertInside(rootPath)).toBe(resolve(rootPath));
    });

    it("allows deeply nested paths", () => {
      const nestedPath = resolve("/fake/workspace/a/b/c/d/file.txt");
      expect(guard.assertInside(nestedPath)).toBe(resolve(nestedPath));
    });

    it("allows relative paths that resolve inside", () => {
      const relativeInside = resolve("/fake/workspace/a/../file.txt");
      expect(guard.assertInside(relativeInside)).toBe(resolve(relativeInside));
    });

    it("rejects paths outside the workspace", () => {
      const outsidePath = resolve("/fake/outside/file.txt");
      expect(() => guard.assertInside(outsidePath)).toThrowError(
        `Refusing workspace path outside the workspace: ${outsidePath}`
      );
    });

    it("rejects parent directories", () => {
      const parentDir = resolve("/fake");
      expect(() => guard.assertInside(parentDir)).toThrowError(
        `Refusing workspace path outside the workspace: ${parentDir}`
      );
    });

    it("rejects sibling directories", () => {
      const siblingDir = resolve("/fake/workspace2");
      expect(() => guard.assertInside(siblingDir)).toThrowError(
        `Refusing workspace path outside the workspace: ${siblingDir}`
      );
    });

    it("rejects path traversal attempting to escape", () => {
      const escapePath = resolve("/fake/workspace/../outside.txt");
      expect(() => guard.assertInside(escapePath)).toThrowError(
        `Refusing workspace path outside the workspace: ${escapePath}`
      );
    });

    it("uses the provided kind in the error message", () => {
      const outsidePath = resolve("/fake/outside/file.txt");
      expect(() => guard.assertInside(outsidePath, "credential")).toThrowError(
        `Refusing credential path outside the workspace: ${outsidePath}`
      );
    });
  });

  describe("assertWorkspaceInput", () => {
    const guard = new WorkspaceGuard(resolve("/fake/workspace"));

    it("allows valid workspace input", () => {
      const validPath = resolve("/fake/workspace/input.md");
      expect(guard.assertWorkspaceInput(validPath)).toBe(resolve(validPath));
    });

    it("rejects invalid workspace input with 'workspace' kind", () => {
      const outsidePath = resolve("/fake/outside.md");
      expect(() => guard.assertWorkspaceInput(outsidePath)).toThrowError(
        `Refusing workspace path outside the workspace: ${outsidePath}`
      );
    });
  });

  describe("assertGeneratedOutput", () => {
    const guard = new WorkspaceGuard(resolve("/fake/workspace"));

    it("allows valid generated output", () => {
      const validPath = resolve("/fake/workspace/output.json");
      expect(guard.assertGeneratedOutput(validPath)).toBe(resolve(validPath));
    });

    it("rejects invalid generated output with 'state' kind", () => {
      const outsidePath = resolve("/fake/outside.json");
      expect(() => guard.assertGeneratedOutput(outsidePath)).toThrowError(
        `Refusing state path outside the workspace: ${outsidePath}`
      );
    });
  });
});
