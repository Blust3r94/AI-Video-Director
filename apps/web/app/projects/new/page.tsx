"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BriefState = { title: string; premise: string; audience: string; duration: string; format: string; visualDirection: string };
const initialBrief: BriefState = { title: "", premise: "", audience: "", duration: "60", format: "16:9", visualDirection: "" };

export default function NewProjectPage() {
  const [brief, setBrief] = useState<BriefState>(initialBrief);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  function update(field: keyof BriefState, value: string) { setBrief((current) => ({ ...current, [field]: value })); setError(""); }
  async function saveDraft(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); try { const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brief) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Impossibile salvare il progetto."); window.localStorage.setItem("avid-demo-brief", JSON.stringify(data.project)); router.push("/projects/plan"); } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Impossibile salvare il progetto."); } finally { setSaving(false); } }
  return <main className="project-page">
    <nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="pill">STEP 01 / 04</span></nav>
    <div className="project-heading"><p className="eyebrow">NUOVO PROGETTO</p><h1>Raccontami cosa vuoi creare.</h1><p>Il Director userà questo brief per preparare concept, scene, shot e continuità. Puoi rifinirlo dopo.</p></div>
    <form className="brief-form" onSubmit={saveDraft}>
      <label>Titolo del progetto<input required value={brief.title} onChange={(e) => update("title", e.target.value)} placeholder="Es. Duello sopra Neo Milano" /></label>
      <label className="wide">Premessa<textarea required rows={5} value={brief.premise} onChange={(e) => update("premise", e.target.value)} placeholder="Descrivi la storia, il messaggio o l'idea centrale…" /></label>
      <label>Pubblico<input required value={brief.audience} onChange={(e) => update("audience", e.target.value)} placeholder="Es. appassionati sci-fi, 18–35" /></label>
      <label>Durata desiderata (secondi)<input required min="5" type="number" value={brief.duration} onChange={(e) => update("duration", e.target.value)} /></label>
      <label>Formato<select value={brief.format} onChange={(e) => update("format", e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option><option>custom</option></select></label>
      <label>Direzione visiva<input value={brief.visualDirection} onChange={(e) => update("visualDirection", e.target.value)} placeholder="Es. sci-fi cupo, camera dinamica, neon" /></label>
      <div className="form-footer"><span>{error || "I campi obbligatori servono a dare una direzione al Director."}</span><button type="submit" disabled={saving}>{saving ? "Salvataggio…" : "Salva e crea il brief"}</button></div>
    </form>
  </main>;
}
