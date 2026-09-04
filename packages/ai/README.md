# AI orchestration package

Implements `DirectorPlanner` from `@avid/domain`.

`MockDirectorPlanner` is a deterministic implementation: it turns a `CreativeBrief` into a
structurally complete `ProductionPlan` (overview, video bible, screenplay, sequence/scene/clip
breakdown, chained continuity states) without calling an LLM, so the rest of the pipeline can be
built and tested against a real shape. An LLM-backed planner will later implement the same
interface and can replace or sit alongside the mock.

Future home for prompt templates, LLM adapters, and output validation once that planner is added.
