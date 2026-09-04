"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProductionPlan } from "@avid/domain";
import { useBrief } from "../../../lib/use-brief";

async function fetchExistingPlan(projectId: string): Promise<ProductionPlan | null> {
  const response = await fetch(`/api/projects/${projectId}/plan`);
  const data = await response.json();
  return (data.plan as ProductionPlan | null) ?? null;
}

async function generatePlan(projectId: string): Promise<ProductionPlan> {
  const response = await fetch(`/api/projects/${projectId}/plan`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Impossibile generare il piano.");
  return data.plan as ProductionPlan;
}

async function loadOrGeneratePlan(projectId: string): Promise<ProductionPlan> {
  const existing = await fetchExistingPlan(projectId);
  return existing ?? generatePlan(projectId);
}

export default function PlanPage() {
  const router = useRouter();
  const brief = useBrief();
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [error, setError] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const requestedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!brief || requestedProjectId.current === brief.id) return;
    requestedProjectId.current = brief.id;
    loadOrGeneratePlan(brief.id)
      .then(setPlan)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossibile generare il piano."));
  }, [brief]);

  async function handleRegenerate() {
    if (!brief || regenerating) return;
    if (!window.confirm("Rigenerare il piano crea una nuova revisione e azzera le approvazioni delle scene già date. Continuare?")) return;
    setRegenerating(true);
    setError("");
    try {
      setPlan(await generatePlan(brief.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile rigenerare il piano.");
    } finally {
      setRegenerating(false);
    }
  }

  if (!brief) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link></nav><section className="empty"><h1>Nessun brief ancora.</h1><p>Prima crea un progetto, poi il Director potrà preparare il piano.</p><Link className="primary" href="/projects/new">Crea un progetto</Link></section></main>;
  }

  if (error) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link></nav><section className="empty"><h1>Qualcosa è andato storto.</h1><p>{error}</p><Link className="primary" href="/projects/new">Ricomincia</Link></section></main>;
  }

  if (!plan) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="pill">STEP 02 / 04</span></nav><section className="plan-heading"><p className="eyebrow">DIRECTOR PLAN</p><h1>Sto preparando il piano…</h1><p>Il Director sta trasformando il brief in struttura, bibbia visiva e continuità.</p></section></main>;
  }

  const characterNames = plan.videoBible.characters.map((character) => character.name).join(", ") || "da definire";
  const locationNames = plan.videoBible.locations.map((location) => location.name).join(", ") || "da definire";

  return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="pill">STEP 02 / 04</span></nav><section className="plan-heading"><p className="eyebrow">DIRECTOR PLAN · REVISIONE {plan.revision}</p><h1>{brief.title}</h1><p>Ho trasformato il tuo brief in una prima struttura narrativa da rivedere insieme.</p></section><section className="plan-grid"><article className="plan-card"><span>CONCEPT</span><h2>{plan.overview.logline}</h2><p>{plan.overview.synopsis}</p></article><article className="plan-card"><span>PARAMETRI</span><dl><div><dt>Pubblico</dt><dd>{brief.audience}</dd></div><div><dt>Durata</dt><dd>{plan.overview.runtimeSeconds} secondi · {plan.overview.aspectRatio}</dd></div><div><dt>Look</dt><dd>{plan.videoBible.cinematic.visualStyle}</dd></div><div><dt>Personaggi</dt><dd>{characterNames}</dd></div><div><dt>Location</dt><dd>{locationNames}</dd></div></dl></article></section><section className="scenes"><div className="section-title"><p className="eyebrow">SEQUENZA PROPOSTA</p><h2>{plan.sequences.length} sequenze, {plan.projectState.totalClips} clip</h2></div><ol>{plan.sequences.map((sequence) => {
    const durationSeconds = sequence.scenes.flatMap((scene) => scene.clips).reduce((sum, clip) => sum + clip.durationSeconds, 0);
    return <li key={sequence.id}><span>{String(sequence.order).padStart(2, "0")}</span><div><h3>{sequence.title}</h3><p>{sequence.summary}</p></div><em>{durationSeconds} sec</em></li>;
  })}</ol></section><div className="plan-actions"><Link href="/projects/new">Modifica il brief</Link><button className="secondary-button" disabled={regenerating} onClick={handleRegenerate}>{regenerating ? "Rigenero…" : "Rigenera il piano"}</button><button onClick={() => router.push("/projects/review")}>Vai alla review</button></div></main>;
}
