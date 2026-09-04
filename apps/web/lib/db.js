import pg from "pg";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is required to use the database.");

const globalForDatabase = globalThis;
export const db = globalForDatabase.avidDatabase ?? new Pool({ connectionString, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDatabase.avidDatabase = db;
