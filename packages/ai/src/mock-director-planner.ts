import { randomUUID } from "node:crypto";
import type {
  CharacterBible,
  CinematicBible,
  Clip,
  ContinuityState,
  ContinuityTransition,
  CreativeBrief,
  CreativeDirection,
  DirectorPlanner,
  LocationBible,
  ProductionPlan,
  ProjectOverview,
  ProjectState,
  Screenplay,
  Sequence,
} from "@avid/domain";

const CLIP_TARGET_SECONDS = 8;
const SHOT_TYPES = ["wide shot", "medium shot", "close-up", "over-the-shoulder"];
const CAMERA_MOVEMENTS = ["static", "slow pan", "dolly-in", "handheld tracking"];

const ACT_TEMPLATES = [
  {
    title: "Il mondo",
    summary: "Stabiliamo ambiente, tono e protagonista.",
    purpose: "Aprire il mondo e presentare il protagonista.",
    action: "Il protagonista entra in scena mentre l'ambiente rivela il tono del progetto.",
  },
  {
    title: "Il conflitto",
    summary: "La tensione sale e costringe il protagonista ad agire.",
    purpose: "Sviluppare il conflitto centrale.",
    action: "Il conflitto tra protagonista e antagonista si intensifica.",
  },
  {
    title: "Il momento decisivo",
    summary: "Una scelta o un colpo di scena chiude con impatto.",
    purpose: "Risolvere il conflitto con impatto visivo.",
    action: "Il protagonista affronta il momento decisivo dello scontro.",
  },
];

const INITIAL_STATE: ContinuityState = {
  characterPosition: "posizione di apertura della scena",
  characterDirection: "rivolto verso l'azione",
  cameraPosition: "inquadratura di apertura",
  lighting: "come da Cinematic Bible",
  environmentState: "intatto",
  wardrobeState: "invariato",
  injuryState: "nessuna",
};

function distributeEvenly(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const counts = Array<number>(count).fill(base);
  let remainder = total - base * count;
  for (let i = 0; i < counts.length && remainder > 0; i += 1, remainder -= 1) counts[i] += 1;
  return counts;
}

function deriveTitle(premise: string): string {
  const trimmed = premise.trim();
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`;
}

function buildOverview(brief: CreativeBrief): ProjectOverview {
  return {
    title: deriveTitle(brief.premise) || "Progetto senza titolo",
    logline: brief.premise,
    synopsis: brief.premise,
    genre: brief.constraints?.length ? brief.constraints : ["da definire"],
    tone: brief.visualDirection ? [brief.visualDirection] : ["da definire"],
    runtimeSeconds: brief.runtimeSeconds,
    aspectRatio: brief.aspectRatio,
  };
}

function buildCreativeDirection(brief: CreativeBrief): CreativeDirection {
  return {
    narrativeGoal: brief.premise,
    visualReferences: [],
    moodKeywords: brief.visualDirection ? [brief.visualDirection] : [],
    pacing: brief.runtimeSeconds <= 60 ? "serrato" : "misurato",
    themes: brief.constraints ?? [],
  };
}

function buildCharacters(): CharacterBible[] {
  return [
    {
      id: randomUUID(),
      name: "Protagonista",
      role: "protagonista",
      apparentAge: "da definire",
      build: "da definire",
      face: "da definire",
      hair: "da definire",
      outfit: "da definire",
      accessories: [],
      physicalCondition: "illesa",
      emotionalState: "determinata",
      arc: "affronta il conflitto centrale del progetto",
    },
    {
      id: randomUUID(),
      name: "Antagonista",
      role: "antagonista",
      apparentAge: "da definire",
      build: "da definire",
      face: "da definire",
      hair: "da definire",
      outfit: "da definire",
      accessories: [],
      physicalCondition: "illesa",
      emotionalState: "minacciosa",
      arc: "si oppone al protagonista",
    },
  ];
}

function buildLocation(brief: CreativeBrief): LocationBible {
  return {
    id: randomUUID(),
    name: "Location principale",
    architecture: "da definire",
    materials: "da definire",
    climate: "da definire",
    timeOfDay: "da definire",
    lighting: brief.visualDirection ?? "naturale",
    damageState: "intatta",
    atmosphere: brief.visualDirection ?? "da definire",
  };
}

function buildCinematicBible(brief: CreativeBrief): CinematicBible {
  return {
    visualStyle: brief.visualDirection || "cinematico, realistico",
    colorGrading: "da definire",
    cameraLenses: ["35mm", "50mm"],
    depthOfField: "media profondità di campo",
    cameraBehavior: "movimenti motivati dall'azione",
    lightingPhilosophy: "alto contrasto, fonti pratiche",
    motionStyle: "dinamico ma leggibile",
  };
}

function buildScreenplay(acts: typeof ACT_TEMPLATES): Screenplay {
  return {
    beats: acts.map((act, index) => ({
      id: randomUUID(),
      order: index + 1,
      heading: act.title.toUpperCase(),
      action: act.action,
    })),
  };
}

function advanceState(previous: ContinuityState, clipNumber: number): ContinuityState {
  return {
    ...previous,
    characterPosition: `avanzata rispetto alla clip ${clipNumber}`,
    cameraPosition: `coerente con l'inquadratura della clip ${clipNumber}`,
  };
}

function buildProjectState(totalClips: number): ProjectState {
  return {
    status: "active",
    totalClips,
    planned: totalClips,
    generated: 0,
    approved: 0,
    requiresRevision: 0,
    currentClipId: null,
  };
}

// Deterministic stand-in for an LLM-backed planner, kept behind the same DirectorPlanner port.
export class MockDirectorPlanner implements DirectorPlanner {
  async createPlan({ projectId, brief }: { projectId: string; brief: CreativeBrief }): Promise<ProductionPlan> {
    const totalClips = Math.max(1, Math.round(brief.runtimeSeconds / CLIP_TARGET_SECONDS));
    const acts = ACT_TEMPLATES.slice(0, Math.min(ACT_TEMPLATES.length, totalClips));
    const clipCountsByAct = distributeEvenly(totalClips, acts.length);
    const clipDurations = distributeEvenly(brief.runtimeSeconds, totalClips);

    const characters = buildCharacters();
    const location = buildLocation(brief);
    const cinematic = buildCinematicBible(brief);
    const transitions: ContinuityTransition[] = [];

    let clipIndex = 0;
    let previousEndingState = INITIAL_STATE;
    let previousClipId: string | null = null;

    const sequences: Sequence[] = acts.map((act, actIndex) => {
      const clips: Clip[] = Array.from({ length: clipCountsByAct[actIndex] }, () => {
        const order = clipIndex + 1;
        const startingState = previousEndingState;
        const endingState = advanceState(startingState, order);
        const clip: Clip = {
          id: randomUUID(),
          order,
          durationSeconds: clipDurations[clipIndex],
          narrativePurpose: act.purpose,
          action: `${act.action} (clip ${order} di ${totalClips})`,
          characterIds: characters.map((character) => character.id),
          locationId: location.id,
          cameraShot: SHOT_TYPES[clipIndex % SHOT_TYPES.length],
          cameraMovement: CAMERA_MOVEMENTS[clipIndex % CAMERA_MOVEMENTS.length],
          lighting: cinematic.lightingPhilosophy,
          startingState,
          endingState,
          status: "planned",
        };
        if (previousClipId) transitions.push({ fromClipId: previousClipId, toClipId: clip.id, carriedState: startingState, status: "consistent" });
        previousEndingState = endingState;
        previousClipId = clip.id;
        clipIndex += 1;
        return clip;
      });
      return {
        id: randomUUID(),
        order: actIndex + 1,
        title: act.title,
        summary: act.summary,
        scenes: [{ id: randomUUID(), order: 1, title: act.title, summary: act.summary, locationId: location.id, status: "draft", clips }],
      };
    });

    return {
      id: randomUUID(),
      projectId,
      revision: 1,
      status: "draft",
      overview: buildOverview(brief),
      creativeDirection: buildCreativeDirection(brief),
      videoBible: { characters, locations: [location], cinematic },
      screenplay: buildScreenplay(acts),
      sequences,
      continuityMap: { transitions },
      projectState: buildProjectState(totalClips),
      createdAt: new Date(),
    };
  }
}
