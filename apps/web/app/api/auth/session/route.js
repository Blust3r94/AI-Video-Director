import { NextResponse } from "next/server";
import { getSessionUser } from "../../../../lib/session";

export async function GET(request) {
  const session = await getSessionUser(request);
  return NextResponse.json({ user: session ? { email: session.email } : null });
}
