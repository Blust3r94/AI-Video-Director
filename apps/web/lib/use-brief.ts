"use client";
import { useSyncExternalStore } from "react";

export type Brief = { id: string; title: string; premise: string; audience: string; duration: string; format: string; visualDirection: string };

let cachedRaw: string | null | undefined;
let cachedBrief: Brief | null = null;
function getStoredBrief(): Brief | null {
  const raw = window.localStorage.getItem("avid-demo-brief");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedBrief = raw ? (JSON.parse(raw) as Brief) : null;
  }
  return cachedBrief;
}

export function useBrief(): Brief | null {
  return useSyncExternalStore(() => () => undefined, getStoredBrief, () => null);
}
