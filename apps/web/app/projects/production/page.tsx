"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductionPlan } from "@avid/domain";
import { useBrief } from "../../../lib/use-brief";
import { useRequireSession } from "../../../lib/use-session";
import { AuthStatus } from "../../../lib/auth-status";

type Job = {
  id: string;
  kind: string;
  status: string;
  sceneTitle: string;
  narrativePurpose: string;
  cameraShot: string;
  cameraMovement: string;
  outputUrl: string | null;
  errorMessage: string | null;
};

type Row = { id: string; label: string; title: string; description: string; status: string; outputUrl: string | null; errorMessage: string | null };

const STATUS_LABELS: Record<string, string> = {
  queued: "In coda",
  running: "In corso",
  succeeded: "Completato",
  failed: "Fallito",
  cancelled: "Annullato",
};

async function fetchPlan(projectId: string): Promise<ProductionPlan | null> {
  const response = await fetch(`/api/projects/${projectId}/plan`);
  const data = await response.json();
  return (data.plan as ProductionPlan | null) ?? null;
}

async function fetchJobs(projectId: string): Promise<Job[]> {
  const response = await fetch(`/api/projects/${projectId}/jobs`);
  const data = await response.json();
  return (data.jobs as Job[] | undefined) ?? [];
}

async function launchProduction(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}/jobs`, { method: "POST" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Impossibile avviare la produzione.");
}

export default function ProductionPage() {
  const user = useRequireSession();
  const brief = useBrief();
  const [plan, setPlan] = useState<ProductionPlan | null | undefined>(undefined);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const requestedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!brief || requestedProjectId.current === brief.id) return;
    requestedProjectId.current = brief.id;
    Promise.all([fetchPlan(brief.id), fetchJobs(brief.id)])
      .then(([loadedPlan, loadedJobs]) => {
        setPlan(loadedPlan);
        setJobs(loadedJobs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Impossibile caricare la produzione."));
  }, [brief]);

  useEffect(() => {
    if (!brief || jobs.length === 0) return;
    const stillProcessing = jobs.some((job) => job.status === "queued" || job.status === "running");
    if (!stillProcessing) return;
    const interval = setInterval(() => {
      fetchJobs(brief.id).then(setJobs).catch(() => {});
    }, 2500);
    return () => clearInterval(interval);
  }, [brief, jobs]);

  async function handleLaunch() {
    if (!brief || launching) return;
    setLaunching(true);
    setError("");
    try {
      await launchProduction(brief.id);
      setJobs(await fetchJobs(brief.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile avviare la produzione.");
    } finally {
      setLaunching(false);
    }
  }

  if (!user) return null;

  if (!brief) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><AuthStatus /></nav><section className="empty"><h1>Il progetto non è disponibile.</h1><Link className="primary" href="/projects/new">Crea un progetto</Link></section></main>;
  }

  if (plan === undefined) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="nav-right"><span className="pill">STEP 04 / 04</span><AuthStatus /></span></nav><section className="production-heading"><p className="eyebrow">PRODUCTION QUEUE</p><h1>Carico la produzione…</h1></section></main>;
  }

  if (plan === null) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><AuthStatus /></nav><section className="empty"><h1>Nessun piano ancora.</h1><p>Genera prima il piano per questo progetto.</p><Link className="primary" href="/projects/plan">Vai al piano</Link></section></main>;
  }

  const approvedClips = plan.sequences.flatMap((sequence) =>
    sequence.scenes.filter((scene) => scene.status === "approved").flatMap((scene) => scene.clips.map((clip) => ({ ...clip, sceneTitle: scene.title })))
  );
  const launched = jobs.length > 0;

  const rows: Row[] = launched
    ? jobs.map((job) => ({
        id: job.id,
        label: job.sceneTitle,
        title: job.narrativePurpose,
        description: `${job.cameraShot} · ${job.cameraMovement}`,
        status: STATUS_LABELS[job.status] ?? job.status,
        outputUrl: job.outputUrl,
        errorMessage: job.errorMessage,
      }))
    : approvedClips.map((clip) => ({
        id: clip.id,
        label: clip.sceneTitle,
        title: clip.narrativePurpose,
        description: `${clip.cameraShot} · ${clip.cameraMovement}`,
        status: "Da avviare",
        outputUrl: null,
        errorMessage: null,
      }));

  return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="nav-right"><span className="pill">STEP 04 / 04</span><AuthStatus /></span></nav><section className="production-heading"><p className="eyebrow">PRODUCTION QUEUE</p><h1>{launched ? "Produzione in coda." : "Pronto a produrre."}</h1><p><strong>{brief.title}</strong> · {plan.overview.runtimeSeconds} secondi · {plan.overview.aspectRatio} · {rows.length} clip {launched ? "in coda" : "pronte"}</p></section><section className="queue"><div className="queue-labels"><span>SCENA</span><span>CLIP</span><span>STATO</span></div>{rows.map((row) => <article key={row.id}><span>{row.label}</span><div><h2>{row.title}</h2><p>{row.description}</p>{row.outputUrl && <p><a href={row.outputUrl} target="_blank" rel="noreferrer">Guarda la clip generata</a></p>}{row.errorMessage && <p>{row.errorMessage}</p>}</div><em><i />{row.status}</em></article>)}</section><section className="production-note"><strong>Coda di produzione.</strong><p>{launched ? "I job sono reali e tracciati nel database. Se il worker è in esecuzione (in locale con npm run worker, in produzione ogni 5 minuti) li processa automaticamente — questa pagina si aggiorna da sola finché restano job in coda o in corso." : "Avviare la produzione crea un job reale per ogni clip approvata."}</p>{error && <p>{error}</p>}</section><div className="plan-actions"><Link href="/projects/review">Torna alla review</Link><button disabled={launched || launching || approvedClips.length === 0} onClick={handleLaunch}>{launching ? "Avvio…" : launched ? "Produzione avviata" : "Avvia produzione"}</button></div></main>;
}
