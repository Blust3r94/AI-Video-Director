import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { verifyPassword } from "../../../../lib/password";
import { createSession, setSessionCookie } from "../../../../lib/session";

const text = (value) => (typeof value === "string" ? value.trim() : "");
const invalidCredentials = () => NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });

export async function POST(request) {
  const input = await request.json();
  const email = text(input.email).toLowerCase();
  const password = text(input.password);
  if (!email || !password) return invalidCredentials();

  const result = await db.query("SELECT id, password_hash FROM users WHERE email = $1", [email]);
  if (!result.rows.length) return invalidCredentials();

  const user = result.rows[0];
  if (!(await verifyPassword(password, user.password_hash))) return invalidCredentials();

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.json({ user: { email } });
  setSessionCookie(response, token, expiresAt);
  return response;
}
