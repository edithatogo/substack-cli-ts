import { isAbsolute, relative, resolve, sep } from "node:path";

export type WorkspacePathKind = "workspace" | "credential" | "config" | "state" | "cache";

export class WorkspaceGuard {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  assertInside(candidate: string, kind: WorkspacePathKind = "workspace"): string {
    const target = resolve(candidate);
    const relation = relative(this.root, target);
    if (isAbsolute(relation) || (relation !== "" && relation.startsWith(`..${sep}`)) || relation === "..") {
      throw new Error(`Refusing ${kind} path outside the workspace: ${candidate}`);
    }
    return target;
  }

  assertWorkspaceInput(candidate: string): string {
    return this.assertInside(candidate, "workspace");
  }

  assertGeneratedOutput(candidate: string): string {
    return this.assertInside(candidate, "state");
  }
}
