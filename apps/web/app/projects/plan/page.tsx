"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
type Brief = { title: string; premise: string; audience: string; duration: string; format: string; visualDirection: string };
let cachedRaw: string | null | undefined;
let cachedBrief: Brief | null = null;
function getStoredBrief() {
  const raw = window.localStorage.getItem("avid-demo-brief");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedBrief = raw ? JSON.parse(raw) as Brief : null;
  }
  return cachedBrief;
}
export default function PlanPage() {
  const router = useRouter();
  const brief = useSyncExternalStore(() => () => undefined, getStoredBrief, () => null);
  if (!brief) return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link></nav><section className="empty"><h1>Nessun brief ancora.</h1><p>Prima crea un progetto, poi il Director potrà preparare il piano.</p><Link className="primary" href="/projects/new">Crea un progetto</Link></section></main>;
  const style = brief.visualDirection || "Direzione visiva da definire";
  return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="pill">STEP 02 / 04</span></nav><section className="plan-heading"><p className="eyebrow">DIRECTOR PLAN · BOZZA 01</p><h1>{brief.title}</h1><p>Ho trasformato il tuo brief in una prima struttura narrativa da rivedere insieme.</p></section><section className="plan-grid"><article className="plan-card"><span>CONCEPT</span><h2>Uno scontro che cambia tutto.</h2><p>{brief.premise}</p></article><article className="plan-card"><span>PARAMETRI</span><dl><div><dt>Pubblico</dt><dd>{brief.audience}</dd></div><div><dt>Durata</dt><dd>{brief.duration} secondi · {brief.format}</dd></div><div><dt>Look</dt><dd>{style}</dd></div></dl></article></section><section className="scenes"><div className="section-title"><p className="eyebrow">SEQUENZA PROPOSTA</p><h2>3 scene, 6 shot</h2></div><ol><li><span>01</span><div><h3>Il mondo</h3><p>Apriamo sull’ambiente e impostiamo tono, scala e protagonista.</p></div><em>20 sec</em></li><li><span>02</span><div><h3>Il conflitto</h3><p>Il problema emerge: la tensione sale e costringe il protagonista ad agire.</p></div><em>25 sec</em></li><li><span>03</span><div><h3>Il momento decisivo</h3><p>Una scelta, un colpo di scena o una rivelazione chiude con impatto.</p></div><em>15 sec</em></li></ol></section><div className="plan-actions"><Link href="/projects/new">Modifica il brief</Link><button onClick={() => { window.localStorage.setItem("avid-demo-plan-approved", "true"); router.push("/projects/review"); }}>Approva il piano</button></div></main>;
}
