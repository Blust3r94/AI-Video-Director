import pg from "pg";
import { MockMediaGenerationProvider } from "@avid/ai";

const SIMULATED_PROCESSING_MS = 4000;

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL ?? "postgresql://avid:avid@localhost:5432/avid" });
const provider = new MockMediaGenerationProvider();

export async function claimNextJob() {
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

async function processMediaGenerationJob(job) {
  const clipResult = await pool.query("SELECT prompt FROM clips WHERE id = $1", [job.clip_id]);
  const prompt = clipResult.rows[0]?.prompt;
  if (!prompt) throw new Error(`clip ${job.clip_id} has no generation prompt`);

  const { providerJobId } = await provider.requestGeneration({ clipId: job.clip_id, prompt });
  await pool.query("UPDATE jobs SET provider_name = $1, provider_job_id = $2 WHERE id = $3", ["mock-provider", providerJobId, job.id]);

  await new Promise((resolve) => setTimeout(resolve, SIMULATED_PROCESSING_MS));

  await pool.query("UPDATE jobs SET status = 'succeeded', completed_at = now(), output = $1 WHERE id = $2", [
    JSON.stringify({ simulated: true, providerJobId }),
    job.id,
  ]);
  await pool.query("UPDATE clips SET status = 'generated', updated_at = now() WHERE id = $1", [job.clip_id]);
}

export async function processJob(job) {
  console.log(`[worker] processing ${job.kind} job ${job.id}`);
  try {
    if (job.kind === "media_generation") {
      await processMediaGenerationJob(job);
    } else {
      throw new Error(`unsupported job kind: ${job.kind}`);
    }
    console.log(`[worker] job ${job.id} succeeded`);
  } catch (error) {
    console.error(`[worker] job ${job.id} failed:`, error.message);
    await pool.query("UPDATE jobs SET status = 'failed', completed_at = now(), error_message = $1 WHERE id = $2", [error.message, job.id]);
    if (job.clip_id) await pool.query("UPDATE clips SET status = 'revision_required', updated_at = now() WHERE id = $1", [job.clip_id]);
  }
}

// Claims and processes queued jobs one at a time until the queue is empty or maxJobs is
// reached, then returns -- the shape a scheduled/cron trigger needs (run, exit, run again later).
export async function processBatch(maxJobs) {
  let processed = 0;
  while (processed < maxJobs) {
    const job = await claimNextJob();
    if (!job) break;
    await processJob(job);
    processed += 1;
  }
  return processed;
}
