import { generateSeedanceVideo } from "../video/wavespeed";
import { saveRemoteVideoLocally } from "../video/storage";

export type VvsVideoInput = {
  sourceImageUrl: string;
  prompt: string;
  videoGenerationId: string;
  modelId: string;
  durationSeconds: number;
};

export type VvsVideoResult = {
  videoUrl: string;
  remoteVideoUrl: string;
  modelId: string;
  providerJobId: string;
};

export async function generateVvsVideo(input: VvsVideoInput): Promise<VvsVideoResult> {
  const { videoUrl: remoteVideoUrl, modelId, providerJobId } = await generateSeedanceVideo({
    imageUrl: input.sourceImageUrl,
    prompt: input.prompt,
    durationSeconds: input.durationSeconds,
  });

  const videoUrl = await saveRemoteVideoLocally(remoteVideoUrl, input.videoGenerationId);

  return { videoUrl, remoteVideoUrl, modelId, providerJobId };
}
