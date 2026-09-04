import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { requireSession } from "../../../lib/session";

const text = (value) => typeof value === "string" ? value.trim() : "";

export async function GET(request) {
  const { session, response } = await requireSession(request);
  if (!session) return response;

  const result = await db.query(
    `SELECT projects.id, projects.title, projects.status, projects.created_at, projects.updated_at,
            project_briefs.premise, project_briefs.target_audience, project_briefs.runtime_seconds,
            project_briefs.aspect_ratio, project_briefs.visual_direction
     FROM projects
     LEFT JOIN project_briefs ON project_briefs.project_id = projects.id
     WHERE projects.workspace_id = $1
     ORDER BY projects.updated_at DESC`,
    [session.workspaceId]
  );

  const projects = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    premise: row.premise,
    audience: row.target_audience,
    duration: row.runtime_seconds != null ? String(row.runtime_seconds) : null,
    format: row.aspect_ratio,
    visualDirection: row.visual_direction ?? "",
  }));

  return NextResponse.json({ projects });
}

export async function POST(request) {
  const { session, response } = await requireSession(request);
  if (!session) return response;

  const input = await request.json();
  const title = text(input.title), premise = text(input.premise), audience = text(input.audience);
  const duration = Number(input.duration), format = text(input.format), visualDirection = text(input.visualDirection);
  if (!title || !premise || !audience || !Number.isInteger(duration) || duration < 5 || duration > 14400 || !["16:9", "9:16", "1:1", "custom"].includes(format)) return NextResponse.json({ error: "Brief non valido. Controlla i campi obbligatori." }, { status: 400 });
  const projectId = randomUUID();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO projects (id, workspace_id, title, status, created_by) VALUES ($1, $2, $3, 'planning', $4)", [projectId, session.workspaceId, title, session.userId]);
    await client.query("INSERT INTO project_briefs (project_id, premise, target_audience, runtime_seconds, aspect_ratio, visual_direction, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7)", [projectId, premise, audience, duration, format, visualDirection || null, session.userId]);
    await client.query("INSERT INTO activity_events (id, workspace_id, project_id, actor_id, event_type) VALUES ($1, $2, $3, $4, $5)", [randomUUID(), session.workspaceId, projectId, session.userId, "project.created"]);
    await client.query("COMMIT");
    return NextResponse.json({ project: { id: projectId, title, premise, audience, duration: String(duration), format, visualDirection } }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to create project", error);
    return NextResponse.json({ error: "Impossibile salvare il progetto." }, { status: 500 });
  } finally { client.release(); }
}
