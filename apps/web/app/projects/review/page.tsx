"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProductionPlan, Scene } from "@avid/domain";
import { useBrief } from "../../../lib/use-brief";
import { useRequireSession } from "../../../lib/use-session";
import { AuthStatus } from "../../../lib/auth-status";

async function fetchPlan(projectId: string): Promise<ProductionPlan | null> {
  const response = await fetch(`/api/projects/${projectId}/plan`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Impossibile caricare il piano.");
  return data.plan ?? null;
}

async function updateSceneStatus(sceneId: string, status: Scene["status"]): Promise<void> {
  const response = await fetch(`/api/scenes/${sceneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Impossibile aggiornare la scena.");
  }
}

export default function ReviewPage() {
  const router = useRouter();
  const user = useRequireSession();
  const brief = useBrief();
  const [plan, setPlan] = useState<ProductionPlan | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [pendingSceneId, setPendingSceneId] = useState<string | null>(null);
  const requestedProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (!brief || requestedProjectId.current === brief.id) return;
    requestedProjectId.current = brief.id;
    fetchPlan(brief.id)
      .then(setPlan)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossibile caricare il piano."));
  }, [brief]);

  async function toggleScene(sceneId: string, currentStatus: Scene["status"]) {
    const nextStatus: Scene["status"] = currentStatus === "approved" ? "draft" : "approved";
    setPendingSceneId(sceneId);
    setError("");
    try {
      await updateSceneStatus(sceneId, nextStatus);
      setPlan((current) =>
        current
          ? {
              ...current,
              sequences: current.sequences.map((sequence) => ({
                ...sequence,
                scenes: sequence.scenes.map((scene) => (scene.id === sceneId ? { ...scene, status: nextStatus } : scene)),
              })),
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossibile aggiornare la scena.");
    } finally {
      setPendingSceneId(null);
    }
  }

  if (!user) return null;

  if (!brief) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><AuthStatus /></nav><section className="empty"><h1>Nessun brief ancora.</h1><p>Prima crea un progetto, poi potrai rivedere il piano.</p><Link className="primary" href="/projects/new">Crea un progetto</Link></section></main>;
  }

  if (plan === null) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><AuthStatus /></nav><section className="empty"><h1>Nessun piano ancora.</h1><p>Genera prima il piano per questo progetto.</p><Link className="primary" href="/projects/plan">Vai al piano</Link></section></main>;
  }

  if (plan === undefined) {
    return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="nav-right"><span className="pill">STEP 03 / 04</span><AuthStatus /></span></nav><section className="review"><p className="eyebrow">REVIEW & APPROVAL</p><h1>Carico il piano…</h1></section></main>;
  }

  const scenes = plan.sequences.flatMap((sequence) => sequence.scenes.map((scene) => ({ ...scene, sequenceTitle: sequence.title })));
  const approvedCount = scenes.filter((scene) => scene.status === "approved").length;
  const allApproved = scenes.length > 0 && approvedCount === scenes.length;

  return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="nav-right"><span className="pill">STEP 03 / 04</span><AuthStatus /></span></nav><section className="review"><p className="eyebrow">REVIEW & APPROVAL</p><div className="approval-mark">{allApproved ? "✓" : `${approvedCount}/${scenes.length}`}</div><h1>{allApproved ? "Piano approvato." : "Approva ogni scena."}</h1><p>{allApproved ? "Le scene sono ora pronte per la fase di produzione. Prepariamo una coda di lavoro senza inviare ancora richieste a generatori video." : `${error || "Rivedi e approva ciascuna scena prima di procedere."}`}</p></section><section className="scenes"><div className="section-title"><p className="eyebrow">SCENE</p><h2>{scenes.length} scene da rivedere</h2></div><ol className="scene-list">{scenes.map((scene) => <li key={scene.id}><span>{scene.sequenceTitle}</span><div><h3>{scene.title}</h3><p>{scene.summary}</p></div><button className="approve-button" disabled={pendingSceneId === scene.id} onClick={() => toggleScene(scene.id, scene.status)}>{scene.status === "approved" ? "Approvata ✓" : "Approva"}</button></li>)}</ol></section><div className="review-actions"><Link href="/projects/plan">Torna al piano</Link><button disabled={!allApproved} onClick={() => router.push("/projects/production")}>Prepara la produzione</button></div></main>;
}
