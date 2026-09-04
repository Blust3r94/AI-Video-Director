# AI orchestration package

Implements `DirectorPlanner` from `@avid/domain`.

`MockDirectorPlanner` is a deterministic implementation: it turns a `CreativeBrief` into a
structurally complete `ProductionPlan` (overview, video bible, screenplay, sequence/scene/clip
breakdown, chained continuity states) without calling an LLM, so the rest of the pipeline can be
built and tested against a real shape. An LLM-backed planner will later implement the same
interface and can replace or sit alongside the mock.

Future home for prompt templates, LLM adapters, and output validation once that planner is added.

## MediaGenerationProvider

Also implements `MediaGenerationProvider`, the port `packages/worker` calls to actually generate
video for a clip. It's submit-then-poll (`requestGeneration` hands work off and returns
immediately; `checkGeneration` is called again later, possibly many times, until it stops
returning `"processing"`) because real generation is asynchronous and can take minutes.

- `MockMediaGenerationProvider` -- deterministic stand-in, always reports success on the first
  check. Used automatically whenever `FAL_KEY` isn't set.
- `FalMediaGenerationProvider` -- calls [fal.ai's queue API](https://fal.ai/docs/model-endpoints/queue).
  Needs `FAL_KEY` (a fal.ai API key); `FAL_MODEL_ID` optionally overrides the default model
  (`fal-ai/ltx-2.3/text-to-video`, cheap/fast). Each model has its own input schema (duration
  encoding, resolution, audio, ...), verified against fal.ai's own OpenAPI schema per model rather
  than assumed -- see `MODEL_CONFIGS` in `fal-media-generation-provider.ts`. Swapping `FAL_MODEL_ID`
  to a model not already in that map needs a new entry there.
  - `fal-ai/veo3.1` -- Google's cinema-grade model, 1080p with native audio forced on (fal.ai
    defaults audio to on server-side regardless, so we always send it explicitly rather than
    silently pay for it without meaning to). Real cost: $0.40/sec at 1080p with audio -- far more
    than LTX, confirm before generating many clips.
  - `fal-ai/veo3.1/fast` -- same model and input schema, optimized for speed/cost: $0.15/sec at
    1080p with audio. Meaningfully cheaper than standard Veo 3.1 for close to the same quality.
