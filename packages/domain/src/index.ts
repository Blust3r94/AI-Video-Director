export type PlanStatus = "draft" | "in_review" | "approved" | "superseded";
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";
export type ClipStatus =
  | "planned"
  | "generating"
  | "generated"
  | "under_review"
  | "approved"
  | "rejected"
  | "revision_required";

export interface CreativeBrief {
  premise: string;
  targetAudience: string;
  runtimeSeconds: number;
  aspectRatio: "16:9" | "9:16" | "1:1" | "custom";
  visualDirection?: string;
  constraints?: string[];
}

export interface ProjectOverview {
  title: string;
  logline: string;
  synopsis: string;
  genre: string[];
  tone: string[];
  runtimeSeconds: number;
  aspectRatio: CreativeBrief["aspectRatio"];
}

export interface CreativeDirection {
  narrativeGoal: string;
  visualReferences: string[];
  moodKeywords: string[];
  pacing: string;
  themes: string[];
}

export interface CharacterBible {
  id: string;
  name: string;
  role: string;
  apparentAge: string;
  build: string;
  face: string;
  hair: string;
  outfit: string;
  accessories: string[];
  physicalCondition: string;
  emotionalState: string;
  arc: string;
  identityLockPrompt?: string;
}

export interface LocationBible {
  id: string;
  name: string;
  architecture: string;
  materials: string;
  climate: string;
  timeOfDay: string;
  lighting: string;
  damageState: string;
  atmosphere: string;
  identityLockPrompt?: string;
}

export interface CinematicBible {
  visualStyle: string;
  colorGrading: string;
  cameraLenses: string[];
  depthOfField: string;
  cameraBehavior: string;
  lightingPhilosophy: string;
  motionStyle: string;
}

export interface VideoBible {
  characters: CharacterBible[];
  locations: LocationBible[];
  cinematic: CinematicBible;
}

export interface ScreenplayBeat {
  id: string;
  order: number;
  heading: string;
  action: string;
  dialogue?: string;
}

export interface Screenplay {
  beats: ScreenplayBeat[];
}

export interface ContinuityState {
  characterPosition: string;
  characterDirection: string;
  cameraPosition: string;
  lighting: string;
  environmentState: string;
  wardrobeState: string;
  injuryState: string;
}

export interface VideoGenerationPrompt {
  subject: string;
  characterIdentityLock: string[];
  action: string;
  environment: string;
  composition: string;
  camera: string;
  lighting: string;
  atmosphere: string;
  cinematicStyle: string;
  visualQuality: string;
  continuity: string;
  endingFrame: string;
}

// A clip's cameraShot/cameraMovement fields already carry shot-list data;
// "Shot List" is a report derived from clips, not a separate entity.
export interface Clip {
  id: string;
  order: number;
  durationSeconds: number;
  narrativePurpose: string;
  action: string;
  characterIds: string[];
  locationId: string;
  cameraShot: string;
  cameraMovement: string;
  lighting: string;
  startingState: ContinuityState;
  endingState: ContinuityState;
  status: ClipStatus;
  prompt?: VideoGenerationPrompt;
}

export interface Scene {
  id: string;
  order: number;
  title: string;
  summary: string;
  locationId: string;
  clips: Clip[];
}

export interface Sequence {
  id: string;
  order: number;
  title: string;
  summary: string;
  scenes: Scene[];
}

export interface ContinuityTransition {
  fromClipId: string;
  toClipId: string;
  carriedState: ContinuityState;
  status: "consistent" | "flagged";
  notes?: string;
}

export interface ContinuityMap {
  transitions: ContinuityTransition[];
}

export interface ProjectState {
  status: "active" | "paused" | "completed" | "archived";
  totalClips: number;
  planned: number;
  generated: number;
  approved: number;
  requiresRevision: number;
  currentClipId: string | null;
}

export interface ProductionPlan {
  id: string;
  projectId: string;
  revision: number;
  status: PlanStatus;
  overview: ProjectOverview;
  creativeDirection: CreativeDirection;
  videoBible: VideoBible;
  screenplay: Screenplay;
  sequences: Sequence[];
  continuityMap: ContinuityMap;
  projectState: ProjectState;
  createdAt: Date;
}

export interface DirectorPlanner {
  createPlan(input: { projectId: string; brief: CreativeBrief }): Promise<ProductionPlan>;
}

export interface MediaGenerationProvider {
  requestGeneration(input: { clipId: string; prompt: VideoGenerationPrompt }): Promise<{ providerJobId: string }>;
}
