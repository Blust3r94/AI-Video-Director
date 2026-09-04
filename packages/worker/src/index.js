import { pool, processBatch } from "./process-jobs.js";

const POLL_INTERVAL_MS = 3000;
const MAX_JOBS_PER_TICK = 5;

async function loop() {
  console.log(`[worker] started, polling every ${POLL_INTERVAL_MS}ms`);
  for (;;) {
    await processBatch(MAX_JOBS_PER_TICK);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

process.on("SIGINT", async () => {
  console.log("\n[worker] shutting down");
  await pool.end();
  process.exit(0);
});

loop();
