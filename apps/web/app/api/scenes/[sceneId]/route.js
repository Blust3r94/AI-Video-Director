import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { requireSession } from "../../../../lib/session";

const VALID_STATUSES = ["draft", "in_review", "approved", "superseded"];

export async function PATCH(request, { params }) {
  const { session, response: unauthorized } = await requireSession(request);
  if (!session) return unauthorized;

  const { sceneId } = await params;
  const body = await request.json();
  const status = body.status;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Stato non valido." }, { status: 400 });
  }

  const client = await db.connect();
  try {
    const result = await client.query(
      `UPDATE scenes SET status = $1, updated_at = now()
       WHERE id = $2
         AND sequence_id IN (
           SELECT sequences.id FROM sequences
           JOIN production_plans ON production_plans.id = sequences.plan_id
           JOIN projects ON projects.id = production_plans.project_id
           WHERE projects.workspace_id = $3
         )
       RETURNING id, status`,
      [status, sceneId, session.workspaceId]
    );
    if (!result.rows.length) return NextResponse.json({ error: "Scena non trovata." }, { status: 404 });
    return NextResponse.json({ scene: result.rows[0] });
  } catch (error) {
    console.error("Unable to update scene", error);
    return NextResponse.json({ error: "Impossibile aggiornare la scena." }, { status: 500 });
  } finally {
    client.release();
  }
}
