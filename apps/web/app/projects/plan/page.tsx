"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ProductionPlan } from "@avid/domain";

type Brief = { id: string; title: string; premise: string; audience: string; duration: string; format: string; visualDirection: string };
let cachedRaw: string | null | undefined;
let cachedBrief: Brief | null = null;
function getStoredBrief() {
  const raw = window.localStorage.getItem("avid-demo-brief");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedBrief = raw ? (JSON.parse(raw) as Brief) : null;
  }
  return cachedBrief;
}

async function loadOrGeneratePlan(projectId: string): Promise<ProductionPlan> {
  const existing = await fetch(`/api/projects/${projectId}/plan`);
  const existingData = await existing.json();
  if (existingData.plan) return existingData.plan as ProductionPlan;

  const generated = await fetch(`/api/projects/${projectId}/plan`, { method: "POST" });
  const generatedData = await generated.json();
  if (!generated.ok) throw new Error(generatedData.error ?? "Impossibile generare il piano.");
  return generatedData.plan as ProductionPlan;
}

export default function PlanPage() {
  const router = useRouter();
  const brief = useSyncExternalStore(() => () => undefined, getStoredBrief, () => null);
  const [plan, setPlan] = useState<ProductionPlan | null>(null);
  const [error, setError] = useState("");
  const requestedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!brief || requestedProjectId.current === brief.id) return;
    requestedProjectId.current = brief.id;
    loadOrGeneratePlan(brief.id)
      .then(setPlan)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossibile generare il piano."));
  }, [brief]);

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
  })}</ol></section><div className="plan-actions"><Link href="/projects/new">Modifica il brief</Link><button onClick={() => { window.localStorage.setItem("avid-demo-plan-approved", "true"); router.push("/projects/review"); }}>Approva il piano</button></div></main>;
}
