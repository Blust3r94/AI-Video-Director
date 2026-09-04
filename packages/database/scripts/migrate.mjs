import { readFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL ?? "postgresql://avid:avid@localhost:5432/avid";
const sql = readFileSync(new URL("../migrations/0001_initial_schema.sql", import.meta.url), "utf8");
const client = new Client({ connectionString });

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Initial database migration applied.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
