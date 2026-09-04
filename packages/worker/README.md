# Worker package

A standalone process that polls the `jobs` table (`SELECT ... FOR UPDATE SKIP LOCKED`, no separate
queue infrastructure needed yet) and processes queued work. Currently handles `media_generation`
jobs: it reads the clip's `VideoGenerationPrompt`, calls a `MediaGenerationProvider` from `@avid/ai`,
and updates the job and clip status as it moves through `queued -> running -> succeeded` (or
`failed`).

`MockMediaGenerationProvider` is the current provider: it returns a fake `providerJobId`
immediately, and the worker simulates processing time so status changes are visible in the UI. A
real provider (Runway, Kling, Sora, ...) implements the same `MediaGenerationProvider` port and
plugs in without changing this package's job-polling logic.

Run it (needs `DATABASE_URL`, defaults to the local docker-compose Postgres):

```powershell
npm run worker
```

Not yet handled: retrying a job stuck in `running` after a crash, `reference_generation` jobs,
webhooks instead of polling. Redis is available via docker-compose but unused here -- Postgres's
row locking is enough for a single worker process at this scale.
