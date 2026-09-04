import type { MediaGenerationCheckResult, MediaGenerationProvider, MediaGenerationRequest, VideoGenerationPrompt } from "@avid/domain";

const QUEUE_BASE = "https://queue.fal.run";
const DEFAULT_MODEL_ID = "fal-ai/ltx-2.3/text-to-video";
const SUPPORTED_ASPECT_RATIOS = new Set(["16:9", "9:16"]);

// Each fal.ai model has its own input schema (verified against fal.ai's own OpenAPI schema for
// each model, not guessed) -- duration in particular varies in both allowed values and encoding
// (a plain number of seconds vs. a "8s"-style string). Add an entry here for any new FAL_MODEL_ID.
interface ModelConfig {
  supportedDurations: number[];
  extraParams: (durationSeconds: number) => Record<string, unknown>;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "fal-ai/ltx-2.3/text-to-video": {
    supportedDurations: [6, 8, 10],
    extraParams: (durationSeconds) => ({ duration: durationSeconds }),
  },
  // Google Veo 3.1: https://fal.ai/models/fal-ai/veo3.1 -- 1080p and audio are both explicit
  // choices here (audio defaults to true server-side, which doubles the price, so we always
  // send it rather than rely on fal.ai's default). $0.40/sec at 1080p with audio.
  "fal-ai/veo3.1": {
    supportedDurations: [4, 6, 8],
    extraParams: (durationSeconds) => ({ duration: `${durationSeconds}s`, resolution: "1080p", generate_audio: true }),
  },
  // Same model, same input schema, optimized for speed/cost: $0.15/sec at 1080p with audio --
  // https://fal.ai/models/fal-ai/veo3.1/fast
  "fal-ai/veo3.1/fast": {
    supportedDurations: [4, 6, 8],
    extraParams: (durationSeconds) => ({ duration: `${durationSeconds}s`, resolution: "1080p", generate_audio: true }),
  },
};

function configFor(modelId: string): ModelConfig {
  return MODEL_CONFIGS[modelId] ?? MODEL_CONFIGS[DEFAULT_MODEL_ID];
}

function nearestSupportedDuration(durationSeconds: number, supportedDurations: number[]): number {
  return supportedDurations.reduce((closest, candidate) =>
    Math.abs(candidate - durationSeconds) < Math.abs(closest - durationSeconds) ? candidate : closest
  );
}

interface FalSubmitResponse {
  request_id: string;
  status_url?: string;
  response_url?: string;
}

interface FalStatusResponse {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | string;
  error_type?: string;
}

interface FalResultResponse {
  video?: { url: string };
}

// fal.ai queue apps can have sub-path endpoints (e.g. "fal-ai/ltx-2.3/text-to-video") whose
// status/result URLs live under a *shorter* path than the one used to submit -- and that
// shortening isn't derivable client-side, it depends on how the app registered its endpoints.
// So instead of reconstructing status/result URLs from the model id, we store the exact
// status_url/response_url fal.ai handed back at submit time inside the opaque providerJobId.
interface FalJobHandle {
  requestId: string;
  statusUrl: string;
  responseUrl: string;
}

function buildPromptText(prompt: VideoGenerationPrompt): string {
  return [
    prompt.subject,
    prompt.action,
    prompt.characterIdentityLock.length ? `Personaggi: ${prompt.characterIdentityLock.join("; ")}.` : "",
    `Ambientazione: ${prompt.environment}.`,
    `Inquadratura: ${prompt.composition}. Camera: ${prompt.camera}.`,
    `Illuminazione: ${prompt.lighting}. Atmosfera: ${prompt.atmosphere}.`,
    `Stile: ${prompt.cinematicStyle}. Qualità: ${prompt.visualQuality}.`,
    `Continuità: ${prompt.continuity}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

// Real generation is asynchronous (fal.ai's queue API: submit, poll a status endpoint, fetch the
// result once COMPLETED) -- see docs at https://fal.ai/docs/model-endpoints/queue.
export class FalMediaGenerationProvider implements MediaGenerationProvider {
  #apiKey: string;
  #modelId: string;

  constructor({ apiKey, modelId }: { apiKey?: string; modelId?: string } = {}) {
    const key = apiKey ?? process.env.FAL_KEY;
    if (!key) throw new Error("FAL_KEY is required for FalMediaGenerationProvider");
    this.#apiKey = key;
    this.#modelId = modelId || process.env.FAL_MODEL_ID || DEFAULT_MODEL_ID;
  }

  async requestGeneration({ prompt, durationSeconds, aspectRatio }: MediaGenerationRequest): Promise<{ providerJobId: string }> {
    const config = configFor(this.#modelId);
    const snappedDuration = nearestSupportedDuration(durationSeconds, config.supportedDurations);
    const response = await fetch(`${QUEUE_BASE}/${this.#modelId}`, {
      method: "POST",
      headers: { Authorization: `Key ${this.#apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildPromptText(prompt),
        aspect_ratio: SUPPORTED_ASPECT_RATIOS.has(aspectRatio) ? aspectRatio : "16:9",
        ...config.extraParams(snappedDuration),
      }),
    });
    if (!response.ok) throw new Error(`fal.ai submit failed (${response.status}): ${await response.text()}`);
    const data = (await response.json()) as FalSubmitResponse;
    if (!data.request_id) throw new Error("fal.ai response missing request_id");
    const handle: FalJobHandle = {
      requestId: data.request_id,
      statusUrl: data.status_url ?? `${QUEUE_BASE}/${this.#modelId}/requests/${data.request_id}/status`,
      responseUrl: data.response_url ?? `${QUEUE_BASE}/${this.#modelId}/requests/${data.request_id}`,
    };
    return { providerJobId: JSON.stringify(handle) };
  }

  async checkGeneration({ providerJobId }: { providerJobId: string }): Promise<MediaGenerationCheckResult> {
    const handle = JSON.parse(providerJobId) as FalJobHandle;

    const statusResponse = await fetch(handle.statusUrl, {
      headers: { Authorization: `Key ${this.#apiKey}` },
    });
    if (!statusResponse.ok) throw new Error(`fal.ai status check failed (${statusResponse.status}): ${await statusResponse.text()}`);
    const statusData = (await statusResponse.json()) as FalStatusResponse;

    if (statusData.status === "IN_QUEUE" || statusData.status === "IN_PROGRESS") {
      return { status: "processing" };
    }
    if (statusData.status !== "COMPLETED") {
      return { status: "failed", errorMessage: statusData.error_type ?? statusData.status ?? "fal.ai reported a failure" };
    }

    const resultResponse = await fetch(handle.responseUrl, {
      headers: { Authorization: `Key ${this.#apiKey}` },
    });
    if (!resultResponse.ok) throw new Error(`fal.ai result fetch failed (${resultResponse.status}): ${await resultResponse.text()}`);
    const resultData = (await resultResponse.json()) as FalResultResponse;
    const outputUrl = resultData.video?.url;
    if (!outputUrl) return { status: "failed", errorMessage: "fal.ai completed but returned no video URL" };
    return { status: "succeeded", outputUrl };
  }
}
