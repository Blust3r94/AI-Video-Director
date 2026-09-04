# AI Video Director

A SaaS workspace that turns a video brief into a production plan: concept, screenplay, character and location bibles, scenes, shots, continuity rules, and reviewable production jobs.

The first MVP deliberately focuses on **planning and project management**. Video, image, voice, and rendering providers are isolated behind provider ports and are not connected yet.

## Start here

```powershell
npm install
docker-compose up -d
Copy-Item apps/web/.env.example apps/web/.env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## MVP scope

- Multi-tenant workspaces and members
- Projects with a structured creative brief
- Director planning run that produces a versioned production plan
- Scene and shot approval workflow
- Job queue contracts, audit trail, and provider abstraction

## Architecture

```text
apps/web                 Next.js product interface and API boundary
packages/domain          Provider-independent business model and contracts
packages/database        SQL migrations, applied with npm run db:migrate
packages/ai              DirectorPlanner implementations (mock now, LLM-backed later)
packages/worker          Future asynchronous jobs home
docs                     Product decisions, roadmap and domain model
```

Read [the MVP plan](docs/mvp.md) before adding a feature. Technical decisions live in [architecture](docs/architecture.md).
