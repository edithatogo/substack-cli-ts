import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import {
  FRONTIER_LAUNCH_CHECKLIST,
  FRONTIER_LAUNCH_CHECKLIST_PATH,
  REQUIRED_LAUNCH_SURFACES,
  renderLaunchChecklist,
  validateLaunchChecklist,
} from "./launch-checklist.js";

describe("frontier launch checklist", () => {
  it("covers every required external launch and admin surface", () => {
    const validation = validateLaunchChecklist();

    assert.equal(validation.status, "ready");
    assert.deepEqual(validation.missing, []);
    for (const surface of REQUIRED_LAUNCH_SURFACES) {
      assert.ok(
        FRONTIER_LAUNCH_CHECKLIST.some((item) => item.surface === surface),
        surface,
      );
    }
  });

  it("requires missing surfaces to be added before readiness", () => {
    const validation = validateLaunchChecklist(
      FRONTIER_LAUNCH_CHECKLIST.filter((item) => item.surface !== "npm"),
    );

    assert.equal(validation.status, "blocked");
    assert.deepEqual(validation.missing, ["npm"]);
  });

  it("renders account-gated boundaries and rollback guidance", () => {
    const markdown = renderLaunchChecklist();

    assert.match(markdown, /^# Frontier Launch and Admin Checklist/);
    assert.match(markdown, /Manual and Account-Gated Boundaries/);
    assert.match(markdown, /npm package publication/);
    assert.match(markdown, /Substack publication admin follow-through/);
    assert.match(markdown, /Rollback:/);
  });

  it("keeps the checked-in checklist synchronized with the renderer", async () => {
    const checkedIn = await readFile(FRONTIER_LAUNCH_CHECKLIST_PATH, "utf8");

    assert.equal(checkedIn, renderLaunchChecklist());
  });
});
