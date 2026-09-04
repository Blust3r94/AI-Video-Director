import { pool, processBatch } from "./process-jobs.js";

const MAX_JOBS_PER_RUN = Number(process.env.WORKER_MAX_JOBS ?? 10);

async function main() {
  const { submitted, polled } = await processBatch(MAX_JOBS_PER_RUN);
  console.log(`[worker] submitted ${submitted} new job(s), polled ${polled} in-flight job(s) this run`);
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error("[worker] fatal error", error);
    await pool.end();
    process.exitCode = 1;
  });
