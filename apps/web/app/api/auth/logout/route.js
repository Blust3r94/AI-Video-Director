import { NextResponse } from "next/server";
import { destroySession, clearSessionCookie, SESSION_COOKIE_NAME } from "../../../../lib/session";

export async function POST(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(token);
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
