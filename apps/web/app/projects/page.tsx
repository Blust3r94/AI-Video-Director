"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRequireSession } from "../../lib/use-session";
import { AuthStatus } from "../../lib/auth-status";
import type { Brief } from "../../lib/use-brief";

type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  premise: string | null;
  audience: string | null;
  duration: string | null;
  format: string | null;
  visualDirection: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  planning: "In pianificazione",
  in_review: "In revisione",
  approved: "Approvato",
  production: "In produzione",
  archived: "Archiviato",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

async function fetchProjects(): Promise<ProjectSummary[]> {
  const response = await fetch("/api/projects");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Impossibile caricare i progetti.");
  return data.projects ?? [];
}

function storeAsActiveBrief(project: ProjectSummary) {
  const brief: Brief = {
    id: project.id,
    title: project.title,
    premise: project.premise ?? "",
    audience: project.audience ?? "",
    duration: project.duration ?? "60",
    format: project.format ?? "16:9",
    visualDirection: project.visualDirection,
  };
  window.localStorage.setItem("avid-demo-brief", JSON.stringify(brief));
}

export default function ProjectsDashboardPage() {
  const user = useRequireSession();
  const [projects, setProjects] = useState<ProjectSummary[] | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : "Impossibile caricare i progetti."));
  }, [user]);

  if (!user) return null;

  return <main className="project-page">
    <nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><AuthStatus /></nav>
    <div className="project-heading"><p className="eyebrow">I TUOI PROGETTI</p><h1>Continua da dove avevi lasciato.</h1><p><Link className="primary" href="/projects/new">Nuovo progetto</Link></p></div>

    {error && <section className="empty"><h1>Qualcosa è andato storto.</h1><p>{error}</p></section>}

    {!error && projects === undefined && <p className="eyebrow">Carico i progetti…</p>}

    {!error && projects && projects.length === 0 && (
      <section className="empty"><h1>Nessun progetto ancora.</h1><p>Crea il primo per iniziare.</p><Link className="primary" href="/projects/new">Nuovo progetto</Link></section>
    )}

    {!error && projects && projects.length > 0 && (
      <section className="queue">
        <div className="queue-labels"><span>AGGIORNATO</span><span>PROGETTO</span><span>STATO</span></div>
        {projects.map((project) => (
          <Link key={project.id} href="/projects/plan" className="row-link" onClick={() => storeAsActiveBrief(project)}>
            <article>
              <span>{formatDate(project.updatedAt)}</span>
              <div><h2>{project.title}</h2><p>{project.premise}</p></div>
              <em><i />{STATUS_LABELS[project.status] ?? project.status}</em>
            </article>
          </Link>
        ))}
      </section>
    )}
  </main>;
}
