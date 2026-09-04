import { randomUUID } from "node:crypto";
import type { MediaGenerationCheckResult, MediaGenerationProvider, MediaGenerationRequest } from "@avid/domain";

// Deterministic stand-in for a real video generation provider, kept behind the same port. By the
// time anything calls checkGeneration -- the next poll tick, at least a few seconds away even in
// local continuous mode -- there's nothing left to simulate waiting for, so it always reports done.
export class MockMediaGenerationProvider implements MediaGenerationProvider {
  async requestGeneration({ clipId }: MediaGenerationRequest): Promise<{ providerJobId: string }> {
    return { providerJobId: `mock-${clipId}-${randomUUID().slice(0, 8)}` };
  }

  async checkGeneration({ providerJobId }: { providerJobId: string }): Promise<MediaGenerationCheckResult> {
    return { status: "succeeded", outputUrl: `https://example.com/mock-video/${providerJobId}.mp4` };
  }
}
