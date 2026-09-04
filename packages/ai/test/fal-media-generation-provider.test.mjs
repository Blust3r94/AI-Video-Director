import { test } from "node:test";
import assert from "node:assert/strict";
import { FalMediaGenerationProvider } from "../src/index.ts";

const basePrompt = {
  subject: "Protagonista",
  characterIdentityLock: ["Protagonista: alto, capelli scuri"],
  action: "corre",
  environment: "una città",
  composition: "wide shot",
  camera: "wide shot, static",
  lighting: "naturale",
  atmosphere: "tesa",
  cinematicStyle: "realistico",
  visualQuality: "alta definizione",
  continuity: "continua dalla clip precedente",
  endingFrame: "termina con un primo piano",
};

// Stubs global fetch with canned responses shaped like fal.ai's real queue API
// (https://fal.ai/docs/model-endpoints/queue), so these tests catch parsing bugs without
// making real (billed) network calls.
function stubFetch(responses) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const response = responses[calls.length - 1];
    if (!response) throw new Error(`Unexpected fetch call ${calls.length}: ${url}`);
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body,
      text: async () => JSON.stringify(response.body),
    };
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test("requestGeneration submits with the Authorization header and stores the returned status/response URLs", async () => {
  const { calls, restore } = stubFetch([
    { body: { request_id: "abc123", status_url: "https://queue.fal.run/fal-ai/ltx-2.3/requests/abc123/status", response_url: "https://queue.fal.run/fal-ai/ltx-2.3/requests/abc123" } },
  ]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key" });
    const { providerJobId } = await provider.requestGeneration({
      clipId: "clip-1",
      prompt: basePrompt,
      durationSeconds: 8,
      aspectRatio: "16:9",
    });
    const handle = JSON.parse(providerJobId);
    assert.equal(handle.requestId, "abc123");
    // fal.ai's own status/response URLs are stored verbatim -- some models expose "sub-path"
    // endpoints (e.g. .../ltx-2.3/text-to-video) whose status/result live under a shorter path
    // that submit -- see fal-media-generation-provider.ts for why we can't reconstruct it.
    assert.equal(handle.statusUrl, "https://queue.fal.run/fal-ai/ltx-2.3/requests/abc123/status");
    assert.equal(handle.responseUrl, "https://queue.fal.run/fal-ai/ltx-2.3/requests/abc123");
    assert.equal(calls[0].options.headers.Authorization, "Key test-key");
    assert.ok(calls[0].url.startsWith("https://queue.fal.run/fal-ai/ltx-2.3/text-to-video"));
  } finally {
    restore();
  }
});

test("requestGeneration snaps duration to the nearest supported value", async () => {
  const { calls, restore } = stubFetch([{ body: { request_id: "abc123" } }]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key" });
    await provider.requestGeneration({ clipId: "clip-1", prompt: basePrompt, durationSeconds: 9, aspectRatio: "16:9" });
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.duration, 8);
  } finally {
    restore();
  }
});

test("requestGeneration encodes duration and forces audio/resolution for Veo 3.1", async () => {
  const { calls, restore } = stubFetch([{ body: { request_id: "abc123" } }]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key", modelId: "fal-ai/veo3.1" });
    await provider.requestGeneration({ clipId: "clip-1", prompt: basePrompt, durationSeconds: 8, aspectRatio: "16:9" });
    const body = JSON.parse(calls[0].options.body);
    // Veo 3.1 takes duration as a "8s"-style string (per its OpenAPI schema), unlike LTX's plain
    // number -- and defaults generate_audio to true server-side, so we always send it explicitly.
    assert.equal(body.duration, "8s");
    assert.equal(body.resolution, "1080p");
    assert.equal(body.generate_audio, true);
    assert.ok(calls[0].url.startsWith("https://queue.fal.run/fal-ai/veo3.1"));
  } finally {
    restore();
  }
});

test("requestGeneration falls back to 16:9 for an unsupported aspect ratio", async () => {
  const { calls, restore } = stubFetch([{ body: { request_id: "abc123" } }]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key" });
    await provider.requestGeneration({ clipId: "clip-1", prompt: basePrompt, durationSeconds: 8, aspectRatio: "1:1" });
    const body = JSON.parse(calls[0].options.body);
    assert.equal(body.aspect_ratio, "16:9");
  } finally {
    restore();
  }
});

const fakeHandle = JSON.stringify({
  requestId: "abc123",
  statusUrl: "https://queue.fal.run/fal-ai/ltx-2.3/requests/abc123/status",
  responseUrl: "https://queue.fal.run/fal-ai/ltx-2.3/requests/abc123",
});

test("checkGeneration reports processing while in progress", async () => {
  const { restore } = stubFetch([{ body: { status: "IN_PROGRESS", request_id: "abc123" } }]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key" });
    const result = await provider.checkGeneration({ providerJobId: fakeHandle });
    assert.equal(result.status, "processing");
  } finally {
    restore();
  }
});

test("checkGeneration fetches the result and extracts the video URL once completed", async () => {
  const { restore } = stubFetch([
    { body: { status: "COMPLETED", request_id: "abc123" } },
    { body: { video: { url: "https://v3.fal.media/files/example.mp4", content_type: "video/mp4" } } },
  ]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key" });
    const result = await provider.checkGeneration({ providerJobId: fakeHandle });
    assert.equal(result.status, "succeeded");
    assert.equal(result.outputUrl, "https://v3.fal.media/files/example.mp4");
  } finally {
    restore();
  }
});

test("checkGeneration reports failure for a non-completed terminal status", async () => {
  const { restore } = stubFetch([{ body: { status: "FAILED", error_type: "content_policy_violation" } }]);
  try {
    const provider = new FalMediaGenerationProvider({ apiKey: "test-key" });
    const result = await provider.checkGeneration({ providerJobId: fakeHandle });
    assert.equal(result.status, "failed");
    assert.equal(result.errorMessage, "content_policy_violation");
  } finally {
    restore();
  }
});

test("throws without an API key instead of silently calling fal.ai unauthenticated", () => {
  const previous = process.env.FAL_KEY;
  delete process.env.FAL_KEY;
  try {
    assert.throws(() => new FalMediaGenerationProvider());
  } finally {
    if (previous !== undefined) process.env.FAL_KEY = previous;
  }
});
