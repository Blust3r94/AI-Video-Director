import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { DEV_USER_ID } from "../../../../../lib/dev-identity";

export async function GET(request, { params }) {
  const { id: projectId } = await params;
  const client = await db.connect();
  try {
    const result = await client.query(
      `SELECT jobs.id, jobs.kind, jobs.status, jobs.created_at,
              scenes.title AS scene_title, clips.narrative_purpose, clips.camera_shot, clips.camera_movement
       FROM jobs
       JOIN clips ON clips.id = jobs.clip_id
       JOIN scenes ON scenes.id = clips.scene_id
       WHERE jobs.project_id = $1
       ORDER BY jobs.created_at ASC`,
      [projectId]
    );
    const jobs = result.rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      createdAt: row.created_at,
      sceneTitle: row.scene_title,
      narrativePurpose: row.narrative_purpose,
      cameraShot: row.camera_shot,
      cameraMovement: row.camera_movement,
    }));
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Unable to load jobs", error);
    return NextResponse.json({ error: "Impossibile caricare la produzione." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request, { params }) {
  const { id: projectId } = await params;
  const client = await db.connect();
  try {
    const projectResult = await client.query("SELECT workspace_id FROM projects WHERE id = $1", [projectId]);
    if (!projectResult.rows.length) return NextResponse.json({ error: "Progetto non trovato." }, { status: 404 });
    const workspaceId = projectResult.rows[0].workspace_id;

    const planResult = await client.query(
      "SELECT id FROM production_plans WHERE project_id = $1 ORDER BY revision DESC LIMIT 1",
      [projectId]
    );
    if (!planResult.rows.length) return NextResponse.json({ error: "Nessun piano trovato per questo progetto." }, { status: 404 });
    const planId = planResult.rows[0].id;

    const clipsResult = await client.query(
      `SELECT clips.id FROM clips
       JOIN scenes ON scenes.id = clips.scene_id
       JOIN sequences ON sequences.id = scenes.sequence_id
       WHERE sequences.plan_id = $1 AND scenes.status = 'approved'
       ORDER BY clips.clip_number`,
      [planId]
    );
    if (!clipsResult.rows.length) return NextResponse.json({ error: "Nessuna scena approvata per questo piano." }, { status: 400 });

    await client.query("BEGIN");

    for (const clip of clipsResult.rows) {
      await client.query(
        `INSERT INTO jobs (id, workspace_id, project_id, clip_id, kind, status, idempotency_key)
         VALUES ($1, $2, $3, $4, 'media_generation', 'queued', $5)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [randomUUID(), workspaceId, projectId, clip.id, `media_generation:${clip.id}`]
      );
    }

    await client.query(
      `INSERT INTO activity_events (id, workspace_id, project_id, actor_id, event_type, payload)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), workspaceId, projectId, DEV_USER_ID, "production.queued", JSON.stringify({ clipCount: clipsResult.rows.length })]
    );

    await client.query("UPDATE projects SET status = 'production', updated_at = now() WHERE id = $1", [projectId]);

    await client.query("COMMIT");
    return NextResponse.json({ queued: clipsResult.rows.length }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to queue production jobs", error);
    return NextResponse.json({ error: "Impossibile avviare la produzione." }, { status: 500 });
  } finally {
    client.release();
  }
}
