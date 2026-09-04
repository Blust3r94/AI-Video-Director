"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, workspaceName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Impossibile creare l'account.");
      router.push("/projects/new");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile creare l'account.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="project-page">
    <nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link></nav>
    <div className="project-heading"><p className="eyebrow">REGISTRATI</p><h1>Crea il tuo workspace.</h1><p>Hai già un account? <Link href="/login">Accedi</Link>.</p></div>
    <form className="brief-form" onSubmit={handleSubmit}>
      <label className="wide">Email<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@esempio.com" /></label>
      <label className="wide">Password<input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="almeno 8 caratteri" /></label>
      <label className="wide">Nome del workspace (opzionale)<input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="Es. Il mio studio" /></label>
      <div className="form-footer"><span>{error || " "}</span><button type="submit" disabled={submitting}>{submitting ? "Creazione…" : "Crea account"}</button></div>
    </form>
  </main>;
}
