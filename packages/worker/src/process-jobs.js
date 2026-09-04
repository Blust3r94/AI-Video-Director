import pg from "pg";
import { FalMediaGenerationProvider, MockMediaGenerationProvider } from "@avid/ai";

const POLL_TIMEOUT_MS = 30 * 60 * 1000;

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://avid:avid@localhost:5432/avid" });

const usingFal = Boolean(process.env.FAL_KEY);
const provider = usingFal ? new FalMediaGenerationProvider() : new MockMediaGenerationProvider();
const PROVIDER_NAME = usingFal ? "fal.ai" : "mock-provider";

async function claimNextQueuedJob() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT id, kind, clip_id FROM jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED"
    );
    if (!result.rows.length) {
      await client.query("COMMIT");
      return null;
    }
    const job = result.rows[0];
    await client.query("UPDATE jobs SET status = 'running', started_at = now(), attempts = attempts + 1 WHERE id = $1", [job.id]);
    if (job.clip_id) await client.query("UPDATE clips SET status = 'generating', updated_at = now() WHERE id = $1", [job.clip_id]);
    await client.query("COMMIT");
    return job;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function failJob(job, message) {
  await pool.query("UPDATE jobs SET status = 'failed', completed_at = now(), error_message = $1 WHERE id = $2", [message, job.id]);
  if (job.clip_id) await pool.query("UPDATE clips SET status = 'revision_required', updated_at = now() WHERE id = $1", [job.clip_id]);
}

// Hands a newly claimed job off to the provider (requestGeneration only returns a provider job
// id -- real generation keeps running after this call returns) and stores that id for later polls.
async function submitJob(job) {
  try {
    if (job.kind !== "media_generation") throw new Error(`unsupported job kind: ${job.kind}`);

    const clipResult = await pool.query(
      `SELECT clips.prompt, clips.duration_seconds, production_plans.overview ->> 'aspectRatio' AS aspect_ratio
       FROM clips
       JOIN scenes ON scenes.id = clips.scene_id
       JOIN sequences ON sequences.id = scenes.sequence_id
       JOIN production_plans ON production_plans.id = sequences.plan_id
       WHERE clips.id = $1`,
      [job.clip_id]
    );
    const row = clipResult.rows[0];
    if (!row?.prompt) throw new Error(`clip ${job.clip_id} has no generation prompt`);

    const { providerJobId } = await provider.requestGeneration({
      clipId: job.clip_id,
      prompt: row.prompt,
      durationSeconds: row.duration_seconds,
      aspectRatio: row.aspect_ratio ?? "16:9",
    });
    await pool.query("UPDATE jobs SET provider_name = $1, provider_job_id = $2 WHERE id = $3", [PROVIDER_NAME, providerJobId, job.id]);
    console.log(`[worker] submitted job ${job.id} -> ${PROVIDER_NAME} ${providerJobId}`);
  } catch (error) {
    console.error(`[worker] job ${job.id} submit failed:`, error.message);
    await failJob(job, error.message);
  }
}

async function submitQueuedJobs(maxJobs) {
  let count = 0;
  while (count < maxJobs) {
    const job = await claimNextQueuedJob();
    if (!job) break;
    await submitJob(job);
    count += 1;
  }
  return count;
}

async function pollJob(job) {
  try {
    const check = await provider.checkGeneration({ providerJobId: job.provider_job_id });

    if (check.status === "processing") {
      if (Date.now() - new Date(job.started_at).getTime() > POLL_TIMEOUT_MS) {
        await failJob(job, "Timed out waiting for the provider to finish.");
        console.error(`[worker] job ${job.id} timed out`);
      }
      return;
    }

    if (check.status === "succeeded") {
      await pool.query("UPDATE jobs SET status = 'succeeded', completed_at = now(), output = $1 WHERE id = $2", [
        JSON.stringify({ outputUrl: check.outputUrl }),
        job.id,
      ]);
      if (job.clip_id) await pool.query("UPDATE clips SET status = 'generated', updated_at = now() WHERE id = $1", [job.clip_id]);
      console.log(`[worker] job ${job.id} succeeded: ${check.outputUrl}`);
      return;
    }

    await failJob(job, check.errorMessage);
    console.error(`[worker] job ${job.id} failed:`, check.errorMessage);
  } catch (error) {
    // A poll request itself failing (network blip, transient 5xx) doesn't mean the generation
    // failed -- leave the job running and let the timeout above catch anything truly stuck.
    console.error(`[worker] job ${job.id} poll error (will retry):`, error.message);
  }
}

async function pollRunningJobs() {
  const result = await pool.query(
    "SELECT id, clip_id, provider_job_id, started_at FROM jobs WHERE status = 'running' AND provider_job_id IS NOT NULL AND kind = 'media_generation'"
  );
  for (const job of result.rows) {
    await pollJob(job);
  }
  return result.rows.length;
}

// Submits up to maxJobs newly queued jobs, then polls every job already in flight, regardless of
// maxJobs -- an in-progress generation must never go unchecked just because new work exists.
export async function processBatch(maxJobs) {
  const submitted = await submitQueuedJobs(maxJobs);
  const polled = await pollRunningJobs();
  return { submitted, polled };
}
