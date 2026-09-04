"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type Brief = { title: string; duration: string; format: string };
let rawCache: string | null | undefined;
let briefCache: Brief | null = null;
function getBrief() { const raw = window.localStorage.getItem("avid-demo-brief"); if (raw !== rawCache) { rawCache = raw; briefCache = raw ? JSON.parse(raw) as Brief : null; } return briefCache; }

const jobs = [
  ["ASSET 01", "Reference pack", "Personaggi, location e stile visivo"],
  ["SHOT 01–02", "Scene 01 · Il mondo", "Establishing e introduzione del protagonista"],
  ["SHOT 03–04", "Scene 02 · Il conflitto", "Confronto, movimento e tensione"],
  ["SHOT 05–06", "Scene 03 · Il momento decisivo", "Climax e frame finale"]
];

export default function ProductionPage() {
  const brief = useSyncExternalStore(() => () => undefined, getBrief, () => null);
  if (!brief) return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link></nav><section className="empty"><h1>Il progetto non è disponibile.</h1><Link className="primary" href="/projects/new">Crea un progetto</Link></section></main>;
  return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="pill">STEP 04 / 04</span></nav><section className="production-heading"><p className="eyebrow">PRODUCTION QUEUE</p><h1>Pronto a produrre.</h1><p><strong>{brief.title}</strong> · {brief.duration} secondi · {brief.format}</p></section><section className="queue"><div className="queue-labels"><span>LAVORO</span><span>CONTENUTO</span><span>STATO</span></div>{jobs.map(([id, title, description]) => <article key={id}><span>{id}</span><div><h2>{title}</h2><p>{description}</p></div><em><i /> In attesa</em></article>)}</section><section className="production-note"><strong>Nessun generatore è ancora collegato.</strong><p>Questa coda è il punto in cui collegheremo in seguito immagini di riferimento, video, voce e montaggio. Prima costruiamo la modifica di scene e shot.</p></section><div className="plan-actions"><Link href="/projects/plan">Torna al piano</Link><button disabled>Avvia produzione</button></div></main>;
}
