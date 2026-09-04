import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { MockDirectorPlanner } from "@avid/ai";
import { db } from "../../../../../lib/db";
import { requireSession } from "../../../../../lib/session";

const planner = new MockDirectorPlanner();

function toCreativeBrief(row) {
  return {
    premise: row.premise,
    targetAudience: row.target_audience,
    runtimeSeconds: row.runtime_seconds,
    aspectRatio: row.aspect_ratio,
    visualDirection: row.visual_direction ?? undefined,
    constraints: row.constraints ?? [],
  };
}

function toCharacterBible(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    apparentAge: row.apparent_age,
    build: row.build,
    face: row.face,
    hair: row.hair,
    outfit: row.outfit,
    accessories: row.accessories,
    physicalCondition: row.physical_condition,
    emotionalState: row.emotional_state,
    arc: row.arc,
    identityLockPrompt: row.identity_lock_prompt ?? undefined,
  };
}

function toLocationBible(row) {
  return {
    id: row.id,
    name: row.name,
    architecture: row.architecture,
    materials: row.materials,
    climate: row.climate,
    timeOfDay: row.time_of_day,
    lighting: row.lighting,
    damageState: row.damage_state,
    atmosphere: row.atmosphere,
    identityLockPrompt: row.identity_lock_prompt ?? undefined,
  };
}

function toClip(row) {
  return {
    id: row.id,
    order: row.clip_number,
    durationSeconds: row.duration_seconds,
    narrativePurpose: row.narrative_purpose,
    action: row.action,
    characterIds: row.character_ids,
    locationId: row.location_id,
    cameraShot: row.camera_shot,
    cameraMovement: row.camera_movement,
    lighting: row.lighting,
    startingState: row.starting_state,
    endingState: row.ending_state,
    status: row.status,
    prompt: row.prompt ?? undefined,
  };
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const list = map.get(row[key]) ?? [];
    list.push(row);
    map.set(row[key], list);
  }
  return map;
}

export async function GET(request, { params }) {
  const { session, response: unauthorized } = await requireSession(request);
  if (!session) return unauthorized;

  const { id: projectId } = await params;
  const client = await db.connect();
  try {
    const planResult = await client.query(
      `SELECT production_plans.* FROM production_plans
       JOIN projects ON projects.id = production_plans.project_id
       WHERE production_plans.project_id = $1 AND projects.workspace_id = $2
       ORDER BY revision DESC LIMIT 1`,
      [projectId, session.workspaceId]
    );
    if (!planResult.rows.length) return NextResponse.json({ plan: null });
    const planRow = planResult.rows[0];

    const [charactersResult, locationsResult, sequencesResult, scenesResult, clipsResult] = await Promise.all([
      client.query("SELECT * FROM characters WHERE plan_id = $1", [planRow.id]),
      client.query("SELECT * FROM locations WHERE plan_id = $1", [planRow.id]),
      client.query("SELECT * FROM sequences WHERE plan_id = $1 ORDER BY sequence_number", [planRow.id]),
      client.query(
        "SELECT scenes.* FROM scenes JOIN sequences ON sequences.id = scenes.sequence_id WHERE sequences.plan_id = $1 ORDER BY scenes.scene_number",
        [planRow.id]
      ),
      client.query(
        "SELECT clips.* FROM clips JOIN scenes ON scenes.id = clips.scene_id JOIN sequences ON sequences.id = scenes.sequence_id WHERE sequences.plan_id = $1 ORDER BY clips.clip_number",
        [planRow.id]
      ),
    ]);

    const clipsByScene = groupBy(clipsResult.rows, "scene_id");
    const scenesBySequence = groupBy(scenesResult.rows, "sequence_id");

    const plan = {
      id: planRow.id,
      projectId: planRow.project_id,
      revision: planRow.revision,
      status: planRow.status,
      overview: planRow.overview,
      creativeDirection: planRow.creative_direction,
      videoBible: {
        characters: charactersResult.rows.map(toCharacterBible),
        locations: locationsResult.rows.map(toLocationBible),
        cinematic: planRow.cinematic_bible,
      },
      screenplay: planRow.screenplay,
      sequences: sequencesResult.rows.map((sequence) => ({
        id: sequence.id,
        order: sequence.sequence_number,
        title: sequence.title,
        summary: sequence.summary,
        scenes: (scenesBySequence.get(sequence.id) ?? []).map((scene) => ({
          id: scene.id,
          order: scene.scene_number,
          title: scene.title,
          summary: scene.summary,
          locationId: scene.location_id,
          status: scene.status,
          clips: (clipsByScene.get(scene.id) ?? []).map(toClip),
        })),
      })),
      continuityMap: planRow.continuity_map,
      projectState: planRow.project_state,
      createdAt: planRow.created_at,
    };

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Unable to load plan", error);
    return NextResponse.json({ error: "Impossibile caricare il piano." }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request, { params }) {
  const { session, response: unauthorized } = await requireSession(request);
  if (!session) return unauthorized;

  const { id: projectId } = await params;
  const client = await db.connect();
  try {
    const briefResult = await client.query(
      `SELECT project_briefs.premise, project_briefs.target_audience, project_briefs.runtime_seconds,
              project_briefs.aspect_ratio, project_briefs.visual_direction, project_briefs.constraints
       FROM project_briefs
       JOIN projects ON projects.id = project_briefs.project_id
       WHERE project_briefs.project_id = $1 AND projects.workspace_id = $2`,
      [projectId, session.workspaceId]
    );
    if (!briefResult.rows.length) return NextResponse.json({ error: "Nessun brief trovato per questo progetto." }, { status: 404 });

    const plan = await planner.createPlan({ projectId, brief: toCreativeBrief(briefResult.rows[0]) });

    await client.query("BEGIN");

    // Lock the project row so two concurrent plan requests for the same project (e.g. a
    // double-fired client effect, or two tabs) serialize instead of racing on the revision number.
    await client.query("SELECT id FROM projects WHERE id = $1 AND workspace_id = $2 FOR UPDATE", [projectId, session.workspaceId]);
    const revisionResult = await client.query(
      "SELECT COALESCE(MAX(revision), 0) + 1 AS next_revision FROM production_plans WHERE project_id = $1",
      [projectId]
    );
    plan.revision = revisionResult.rows[0].next_revision;

    await client.query(
      "UPDATE production_plans SET status = 'superseded' WHERE project_id = $1 AND status != 'superseded'",
      [projectId]
    );

    await client.query(
      `INSERT INTO production_plans (id, project_id, revision, status, overview, creative_direction, screenplay, cinematic_bible, continuity_map, project_state, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        plan.id,
        plan.projectId,
        plan.revision,
        plan.status,
        JSON.stringify(plan.overview),
        JSON.stringify(plan.creativeDirection),
        JSON.stringify(plan.screenplay),
        JSON.stringify(plan.videoBible.cinematic),
        JSON.stringify(plan.continuityMap),
        JSON.stringify(plan.projectState),
        session.userId,
      ]
    );

    for (const character of plan.videoBible.characters) {
      await client.query(
        `INSERT INTO characters (id, plan_id, name, role, apparent_age, build, face, hair, outfit, accessories, physical_condition, emotional_state, arc, identity_lock_prompt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          character.id,
          plan.id,
          character.name,
          character.role,
          character.apparentAge,
          character.build,
          character.face,
          character.hair,
          character.outfit,
          JSON.stringify(character.accessories),
          character.physicalCondition,
          character.emotionalState,
          character.arc,
          character.identityLockPrompt ?? null,
        ]
      );
    }

    for (const location of plan.videoBible.locations) {
      await client.query(
        `INSERT INTO locations (id, plan_id, name, architecture, materials, climate, time_of_day, lighting, damage_state, atmosphere, identity_lock_prompt)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          location.id,
          plan.id,
          location.name,
          location.architecture,
          location.materials,
          location.climate,
          location.timeOfDay,
          location.lighting,
          location.damageState,
          location.atmosphere,
          location.identityLockPrompt ?? null,
        ]
      );
    }

    for (const sequence of plan.sequences) {
      await client.query(
        "INSERT INTO sequences (id, plan_id, sequence_number, title, summary) VALUES ($1, $2, $3, $4, $5)",
        [sequence.id, plan.id, sequence.order, sequence.title, sequence.summary]
      );

      for (const scene of sequence.scenes) {
        const sceneDurationSeconds = scene.clips.reduce((sum, clip) => sum + clip.durationSeconds, 0);
        await client.query(
          `INSERT INTO scenes (id, sequence_id, scene_number, title, summary, location_id, duration_seconds, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [scene.id, sequence.id, scene.order, scene.title, scene.summary, scene.locationId, sceneDurationSeconds, scene.status]
        );

        for (const [index, clip] of scene.clips.entries()) {
          await client.query(
            `INSERT INTO clips (id, scene_id, clip_number, narrative_purpose, action, character_ids, location_id, camera_shot, camera_movement, lighting, starting_state, ending_state, duration_seconds, status, prompt)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
              clip.id,
              scene.id,
              index + 1,
              clip.narrativePurpose,
              clip.action,
              JSON.stringify(clip.characterIds),
              clip.locationId,
              clip.cameraShot,
              clip.cameraMovement,
              clip.lighting,
              JSON.stringify(clip.startingState),
              JSON.stringify(clip.endingState),
              clip.durationSeconds,
              clip.status,
              clip.prompt ? JSON.stringify(clip.prompt) : null,
            ]
          );
        }
      }
    }

    await client.query(
      `INSERT INTO activity_events (id, workspace_id, project_id, actor_id, event_type, payload)
       SELECT $1, workspace_id, $2, $3, $4, $5 FROM projects WHERE id = $2`,
      [randomUUID(), projectId, session.userId, "plan.created", JSON.stringify({ planId: plan.id, revision: plan.revision })]
    );

    await client.query("COMMIT");
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to generate plan", error);
    return NextResponse.json({ error: "Impossibile generare il piano." }, { status: 500 });
  } finally {
    client.release();
  }
}
