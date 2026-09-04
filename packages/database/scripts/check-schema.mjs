import { readFileSync } from "node:fs";

const schema = readFileSync(new URL("../migrations/0001_initial_schema.sql", import.meta.url), "utf8");
const expectedTables = ["workspaces", "memberships", "users", "projects", "project_briefs", "production_plans", "characters", "locations", "sequences", "scenes", "clips", "jobs", "activity_events"];
const missing = expectedTables.filter((table) => !schema.includes(`CREATE TABLE ${table}`));

if (missing.length) throw new Error(`Missing core tables: ${missing.join(", ")}`);
console.log("Database schema contains every MVP core table.");
