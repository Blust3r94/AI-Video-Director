"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

function getApproval() { return window.localStorage.getItem("avid-demo-plan-approved") === "true"; }

export default function ReviewPage() {
  const approved = useSyncExternalStore(() => () => undefined, getApproval, () => false);
  const router = useRouter();
  return <main className="project-page"><nav><Link className="brand" href="/">AI VIDEO DIRECTOR</Link><span className="pill">STEP 03 / 04</span></nav><section className="review"><p className="eyebrow">REVIEW & APPROVAL</p><div className="approval-mark">✓</div><h1>{approved ? "Piano approvato." : "Piano da approvare."}</h1><p>{approved ? "Le scene e gli shot sono ora pronti per la fase di produzione. Prepariamo una coda di lavoro senza inviare ancora richieste a generatori video." : "Torna al piano per approvarlo prima di procedere."}</p><div className="review-actions"><Link href="/projects/plan">Torna al piano</Link><button disabled={!approved} onClick={() => router.push("/projects/production")}>Prepara la produzione</button></div></section></main>;
}
