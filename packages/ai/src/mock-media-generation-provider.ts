import { randomUUID } from "node:crypto";
import type { MediaGenerationProvider, VideoGenerationPrompt } from "@avid/domain";

// Deterministic stand-in for a real video generation provider, kept behind the same port.
export class MockMediaGenerationProvider implements MediaGenerationProvider {
  async requestGeneration({ clipId }: { clipId: string; prompt: VideoGenerationPrompt }): Promise<{ providerJobId: string }> {
    return { providerJobId: `mock-${clipId}-${randomUUID().slice(0, 8)}` };
  }
}
