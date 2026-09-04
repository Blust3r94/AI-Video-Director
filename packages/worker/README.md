# Worker package

Processes work queued in the `jobs` table (`SELECT ... FOR UPDATE SKIP LOCKED`, no separate queue
infrastructure needed yet). The claim/process logic lives in `src/process-jobs.js`; two entry
points share it:

- `src/index.js` (`npm run worker`) -- polls forever, for local development. A continuous process
  makes sense on a machine you leave running.
- `src/run-once.js` (`npm run worker:once`) -- claims and processes queued jobs until the queue is
  empty or `WORKER_MAX_JOBS` (default 10) is reached, then exits. This is the shape a scheduled
  trigger needs, since nothing on Vercel (or most serverless hosts) can run an infinite loop.
  `.github/workflows/worker.yml` runs it every 5 minutes against production via GitHub Actions
  (needs a `DATABASE_URL` repository secret pointing at the same database Vercel uses) -- also
  runnable on demand from the Actions tab (`workflow_dispatch`).

Currently handles `media_generation` jobs: reads the clip's `VideoGenerationPrompt`, calls a
`MediaGenerationProvider` from `@avid/ai`, and moves the job and its clip through
`queued -> running -> succeeded` (or `failed`).

`MockMediaGenerationProvider` is the current provider: it returns a fake `providerJobId`
immediately, and the worker simulates processing time so status changes are visible in the UI. A
real provider (Runway, Kling, Sora, ...) implements the same `MediaGenerationProvider` port and
plugs in without changing this package's job-polling logic.

Run it locally (needs `DATABASE_URL`, defaults to the local docker-compose Postgres):

```powershell
npm run worker        # loop forever
npm run worker:once   # one batch, then exit
```

Not yet handled: retrying a job stuck in `running` after a crash, `reference_generation` jobs,
webhooks instead of polling. Redis is available via docker-compose but unused here -- Postgres's
row locking is enough at this scale.
