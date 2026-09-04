import { randomBytes, randomUUID, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "./db";

export const SESSION_COOKIE_NAME = "avid_session";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.query("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)", [
    randomUUID(),
    userId,
    hashToken(token),
    expiresAt,
  ]);
  return { token, expiresAt };
}

export async function destroySession(token) {
  if (!token) return;
  await db.query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

// One membership per user for now: signup creates exactly one personal workspace and no
// invite flow exists yet, so the join can't be ambiguous. Revisit if that changes.
export async function getSessionUser(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const result = await db.query(
    `SELECT sessions.expires_at, users.id AS user_id, users.email, memberships.workspace_id
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     JOIN memberships ON memberships.user_id = users.id
     WHERE sessions.token_hash = $1
     LIMIT 1`,
    [hashToken(token)]
  );
  if (!result.rows.length) return null;
  const row = result.rows[0];
  if (new Date(row.expires_at) < new Date()) return null;
  return { userId: row.user_id, email: row.email, workspaceId: row.workspace_id };
}

export async function requireSession(request) {
  const session = await getSessionUser(request);
  if (!session) return { session: null, response: NextResponse.json({ error: "Non autenticato." }, { status: 401 }) };
  return { session, response: null };
}

export function setSessionCookie(response, token, expiresAt) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
