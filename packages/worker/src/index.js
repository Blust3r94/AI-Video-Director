import { pool, claimNextJob, processJob } from "./process-jobs.js";

const POLL_INTERVAL_MS = 3000;

async function loop() {
  console.log(`[worker] started, polling every ${POLL_INTERVAL_MS}ms`);
  for (;;) {
    const job = await claimNextJob();
    if (job) {
      await processJob(job);
    } else {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

process.on("SIGINT", async () => {
  console.log("\n[worker] shutting down");
  await pool.end();
  process.exit(0);
});

loop();
