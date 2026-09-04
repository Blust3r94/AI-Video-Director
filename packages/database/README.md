# Database package

This package owns PostgreSQL migrations, tenant-scoped repositories and test fixtures. It never exports database-generated types into `@avid/domain`.

## First migration

`migrations/0001_initial_schema.sql` defines the MVP SaaS model: users, workspaces, memberships, projects, briefs, immutable plan revisions, scenes, shots, assets, background jobs and activity events.

The repository currently has no local PostgreSQL runtime because Docker is not installed on this PC. When a PostgreSQL database is available, apply migrations with a migration runner; never run these SQL files manually against production.

Run the lightweight structural check with:

```powershell
npm run schema:check --workspace=@avid/database
```
