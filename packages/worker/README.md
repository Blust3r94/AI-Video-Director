# Worker package

Processes work queued in the `jobs` table (`SELECT ... FOR UPDATE SKIP LOCKED`, no separate queue
infrastructure needed yet). The claim/submit/poll logic lives in `src/process-jobs.js`; two entry
points share it:

- `src/index.js` (`npm run worker`) -- loops forever, for local development. A continuous process
  makes sense on a machine you leave running.
- `src/run-once.js` (`npm run worker:once`) -- submits newly queued jobs (up to `WORKER_MAX_JOBS`,
  default 10) and polls every job already in flight, then exits. This is the shape a scheduled
  trigger needs, since nothing on Vercel (or most serverless hosts) can run an infinite loop.
  `.github/workflows/worker.yml` runs it every 5 minutes against production via GitHub Actions --
  also runnable on demand from the Actions tab (`workflow_dispatch`).

Currently handles `media_generation` jobs. Each tick does two things, since real generation is
asynchronous and can take minutes rather than seconds:

1. **Submit**: claim a `queued` job, read the clip's `VideoGenerationPrompt` (plus its duration and
   the project's aspect ratio), call `MediaGenerationProvider.requestGeneration`, store the
   returned `providerJobId`. The job is now `running`, but the generation itself is still going on
   the provider's side.
2. **Poll**: for every job already `running` with a `providerJobId`, call
   `MediaGenerationProvider.checkGeneration`. Still processing -> leave it (checked again next
   tick, up to a 30-minute timeout that marks it `failed`). Done -> mark the job `succeeded` with
   the output URL, or `failed` with the provider's error.

## Providers

- `MockMediaGenerationProvider` (default) -- deterministic, always reports success on the first
  poll.
- `FalMediaGenerationProvider` -- real generation via [fal.ai](https://fal.ai)'s queue API. Used
  automatically once `FAL_KEY` is set (env var locally, repository secret in GitHub Actions); no
  code change needed to switch. See `packages/ai/README.md` for the provider details and
  `FAL_MODEL_ID`.

Run it locally (needs `DATABASE_URL`, defaults to the local docker-compose Postgres; set `FAL_KEY`
too if you want real generation instead of the mock):

```powershell
npm run worker        # loop forever
npm run worker:once   # one tick, then exit
```

Not yet handled: `reference_generation` jobs, webhooks instead of polling. Redis is available via
docker-compose but unused here -- Postgres's row locking is enough at this scale.
