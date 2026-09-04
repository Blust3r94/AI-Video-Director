"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "./use-session";

export function AuthStatus() {
  const user = useSession();
  const router = useRouter();

  if (user === undefined) return null;

  if (!user) {
    return <span className="nav-auth"><Link href="/login">Accedi</Link><Link href="/signup">Registrati</Link></span>;
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return <span className="nav-auth"><span>{user.email}</span><button onClick={logout}>Esci</button></span>;
}
