"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossibile accedere.");
      router.push("/projects");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile accedere.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="project-page">
    <nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link></nav>
    <div className="project-heading"><p className="eyebrow">ACCEDI</p><h1>Bentornato.</h1><p>Non hai un account? <Link href="/signup">Registrati</Link>.</p></div>
    <form className="brief-form" onSubmit={handleSubmit}>
      <label className="wide">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@esempio.com" /></label>
      <label className="wide">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></label>
      <div className="form-footer"><span>{error || " "}</span><button type="submit" disabled={submitting}>{submitting ? "Accesso…" : "Accedi"}</button></div>
    </form>
  </main>;
}
