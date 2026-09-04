import { test } from "node:test";
import assert from "node:assert/strict";
import { MockMediaGenerationProvider } from "../src/index.ts";

const baseRequest = {
  clipId: "clip-1",
  prompt: {
    subject: "Protagonista",
    characterIdentityLock: [],
    action: "cammina",
    environment: "una città",
    composition: "wide shot",
    camera: "wide shot, static",
    lighting: "naturale",
    atmosphere: "cupa",
    cinematicStyle: "realistico",
    visualQuality: "alta definizione",
    continuity: "continua dalla clip precedente",
    endingFrame: "termina con un primo piano",
  },
  durationSeconds: 8,
  aspectRatio: "16:9",
};

test("requestGeneration returns a provider job id tied to the clip", async () => {
  const provider = new MockMediaGenerationProvider();
  const { providerJobId } = await provider.requestGeneration(baseRequest);
  assert.ok(providerJobId.includes(baseRequest.clipId));
});

test("checkGeneration reports succeeded with an output URL", async () => {
  const provider = new MockMediaGenerationProvider();
  const { providerJobId } = await provider.requestGeneration(baseRequest);
  const result = await provider.checkGeneration({ providerJobId });
  assert.equal(result.status, "succeeded");
  assert.ok(result.outputUrl.startsWith("https://"));
});
