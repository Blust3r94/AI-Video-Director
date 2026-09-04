import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

const DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEV_WORKSPACE_ID = "00000000-0000-4000-8000-000000000002";
const text = (value) => typeof value === "string" ? value.trim() : "";

export async function POST(request) {
  const input = await request.json();
  const title = text(input.title), premise = text(input.premise), audience = text(input.audience);
  const duration = Number(input.duration), format = text(input.format), visualDirection = text(input.visualDirection);
  if (!title || !premise || !audience || !Number.isInteger(duration) || duration < 5 || duration > 14400 || !["16:9", "9:16", "1:1", "custom"].includes(format)) return NextResponse.json({ error: "Brief non valido. Controlla i campi obbligatori." }, { status: 400 });
  const projectId = randomUUID();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [DEV_USER_ID, "local@avid.test", "Local creator"]);
    await client.query("INSERT INTO workspaces (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING", [DEV_WORKSPACE_ID, "My workspace", "local-workspace"]);
    await client.query("INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING", [DEV_WORKSPACE_ID, DEV_USER_ID]);
    await client.query("INSERT INTO projects (id, workspace_id, title, status, created_by) VALUES ($1, $2, $3, 'planning', $4)", [projectId, DEV_WORKSPACE_ID, title, DEV_USER_ID]);
    await client.query("INSERT INTO project_briefs (project_id, premise, target_audience, runtime_seconds, aspect_ratio, visual_direction, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7)", [projectId, premise, audience, duration, format, visualDirection || null, DEV_USER_ID]);
    await client.query("INSERT INTO activity_events (id, workspace_id, project_id, actor_id, event_type) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), DEV_WORKSPACE_ID, projectId, DEV_USER_ID, "project.created"]);
    await client.query("COMMIT");
    return NextResponse.json({ project: { id: projectId, title, premise, audience, duration: String(duration), format, visualDirection } }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to create project", error);
    return NextResponse.json({ error: "Impossibile salvare il progetto." }, { status: 500 });
  } finally { client.release(); }
}
