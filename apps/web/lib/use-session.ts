"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type SessionUser = { email: string };

export function useSession(): SessionUser | null | undefined {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);
  return user;
}

// Redirects to /login once we know for sure there's no session. Returns undefined both while
// loading and while the redirect is in flight, so callers can use one "not ready" check.
export function useRequireSession(): SessionUser | undefined {
  const user = useSession();
  const router = useRouter();
  useEffect(() => {
    if (user === null) router.replace("/login");
  }, [user, router]);
  return user === null ? undefined : user;
}
