import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { hashPassword } from "../../../../lib/password";
import { createSession, setSessionCookie } from "../../../../lib/session";

const text = (value) => (typeof value === "string" ? value.trim() : "");

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "workspace";
}

export async function POST(request) {
  const input = await request.json();
  const email = text(input.email).toLowerCase();
  const password = text(input.password);
  const workspaceName = text(input.workspaceName) || "Il mio workspace";

  if (!email || !email.includes("@")) return NextResponse.json({ error: "Email non valida." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });

  const client = await db.connect();
  let userId;
  try {
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length) return NextResponse.json({ error: "Esiste già un account con questa email." }, { status: 409 });

    userId = randomUUID();
    const workspaceId = randomUUID();
    const passwordHash = await hashPassword(password);
    const slug = `${slugify(workspaceName)}-${userId.slice(0, 8)}`;

    await client.query("BEGIN");
    await client.query("INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)", [userId, email, passwordHash]);
    await client.query("INSERT INTO workspaces (id, name, slug) VALUES ($1, $2, $3)", [workspaceId, workspaceName, slug]);
    await client.query("INSERT INTO memberships (workspace_id, user_id, role) VALUES ($1, $2, 'owner')", [workspaceId, userId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Unable to sign up", error);
    return NextResponse.json({ error: "Impossibile creare l'account." }, { status: 500 });
  } finally {
    client.release();
  }

  const { token, expiresAt } = await createSession(userId);
  const response = NextResponse.json({ user: { email } }, { status: 201 });
  setSessionCookie(response, token, expiresAt);
  return response;
}
