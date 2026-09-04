# Database package

This package owns PostgreSQL migrations, tenant-scoped repositories and test fixtures. It never exports database-generated types into `@avid/domain`.

## First migration

`migrations/0001_initial_schema.sql` defines the MVP SaaS model: users, workspaces, memberships,
projects, briefs, immutable plan revisions (with the video/creative/cinematic bible, continuity
map and project state as JSONB), characters, locations, sequences, scenes, clips, assets,
background jobs and activity events.

Apply migrations with a migration runner (`npm run db:migrate`); never run these SQL files
manually against production. Nothing has shipped yet, so `0001` is still edited in place rather
than superseded by follow-up migrations — that changes the moment it is first applied outside
local dev.

Run the lightweight structural check with:

```powershell
npm run schema:check --workspace=@avid/database
```
