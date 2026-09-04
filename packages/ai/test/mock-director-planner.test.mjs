import { test } from "node:test";
import assert from "node:assert/strict";
import { MockDirectorPlanner } from "../src/index.ts";

const baseBrief = {
  premise: "Due guerrieri con poteri elementali combattono in una città distrutta durante una tempesta.",
  targetAudience: "appassionati sci-fi, 18-35",
  runtimeSeconds: 120,
  aspectRatio: "16:9",
  visualDirection: "cupo, neon, pioggia battente",
};

function flattenClips(plan) {
  return plan.sequences.flatMap((sequence) => sequence.scenes.flatMap((scene) => scene.clips));
}

test("produces a draft plan with a structurally valid shape", async () => {
  const plan = await new MockDirectorPlanner().createPlan({ projectId: "project-1", brief: baseBrief });
  assert.equal(plan.status, "draft");
  assert.equal(plan.revision, 1);
  assert.equal(plan.projectId, "project-1");
  assert.ok(plan.videoBible.characters.length > 0);
  assert.ok(plan.videoBible.locations.length > 0);
});

test("clip durations sum exactly to the requested runtime", async () => {
  const plan = await new MockDirectorPlanner().createPlan({ projectId: "project-1", brief: baseBrief });
  const totalDuration = flattenClips(plan).reduce((sum, clip) => sum + clip.durationSeconds, 0);
  assert.equal(totalDuration, baseBrief.runtimeSeconds);
});

test("project state counters match the generated clip count", async () => {
  const plan = await new MockDirectorPlanner().createPlan({ projectId: "project-1", brief: baseBrief });
  const clips = flattenClips(plan);
  assert.equal(plan.projectState.totalClips, clips.length);
  assert.equal(plan.projectState.planned, clips.length);
  assert.equal(plan.projectState.generated, 0);
});

test("continuity map chains every consecutive clip", async () => {
  const plan = await new MockDirectorPlanner().createPlan({ projectId: "project-1", brief: baseBrief });
  const clips = flattenClips(plan);
  assert.equal(plan.continuityMap.transitions.length, clips.length - 1);
  for (let i = 0; i < clips.length - 1; i += 1) {
    assert.equal(plan.continuityMap.transitions[i].fromClipId, clips[i].id);
    assert.equal(plan.continuityMap.transitions[i].toClipId, clips[i + 1].id);
    assert.deepEqual(clips[i + 1].startingState, clips[i].endingState);
  }
});

test("handles very short runtimes without breaking invariants", async () => {
  const plan = await new MockDirectorPlanner().createPlan({
    projectId: "project-2",
    brief: { ...baseBrief, runtimeSeconds: 5 },
  });
  const clips = flattenClips(plan);
  assert.ok(clips.length >= 1);
  const totalDuration = clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
  assert.equal(totalDuration, 5);
});
