# Architecture decisions

## Shape

Use a modular monolith first: one web deployment, one worker deployment, one PostgreSQL database, and Redis for queued work. Domain code must not import Next.js, Prisma, or a provider SDK.

## Boundary rule

The domain defines ports such as `DirectorPlanner` and `MediaGenerationProvider`. Infrastructure implements them. This lets us introduce or replace providers without changing projects, shots, approvals, or billing later.

## Data ownership

Every tenant-owned record carries `workspaceId`. Authorization is enforced at the application boundary and reinforced with database policies when the database layer is added.

## Async work

Planning and future generation are idempotent jobs. A job stores input, status, retry metadata, provider reference, and output references. The UI reads job status; it never waits for a generation request.

## Versioning

A production plan is immutable after creation. Edits create a draft revision so approved work remains traceable.
