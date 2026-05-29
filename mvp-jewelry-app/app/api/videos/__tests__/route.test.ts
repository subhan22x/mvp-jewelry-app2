import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestFindUnique: vi.fn(),
  videoCreate: vi.fn(),
  videoFindUnique: vi.fn(),
  videoUpdate: vi.fn(),
  generateSeedanceVideo: vi.fn(),
  buildJewelryVideoPrompt: vi.fn(),
  saveRemoteVideoLocally: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    request: {
      findUnique: mocks.requestFindUnique
    },
    videoGeneration: {
      create: mocks.videoCreate,
      findUnique: mocks.videoFindUnique,
      update: mocks.videoUpdate
    }
  }
}));

vi.mock("@/lib/video/wavespeed", () => ({
  buildJewelryVideoPrompt: mocks.buildJewelryVideoPrompt,
  generateSeedanceVideo: mocks.generateSeedanceVideo
}));

vi.mock("@/src/lib/video/storage", () => ({
  saveRemoteVideoLocally: mocks.saveRemoteVideoLocally
}));

const requestBody = {
  requestId: "req-test",
  accessCode: "ID8"
};

describe("/api/videos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-05T12:00:00.000Z"));
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.VIDEO_ACCESS_CODE = "ID8";
    process.env.APP_BASE_URL = "https://pendant.example.com";

    mocks.buildJewelryVideoPrompt.mockReturnValue("video prompt");
    mocks.requestFindUnique.mockResolvedValue({
      id: "req-test",
      productType: "name",
      Results: [
        {
          id: "result-1",
          variant: 1,
          status: "succeeded",
          imageUrl: "/generated/req-test-v1.png"
        },
        {
          id: "result-2",
          variant: 2,
          status: "succeeded",
          imageUrl: "/generated/req-test-v2.png"
        }
      ]
    });
    mocks.videoCreate.mockResolvedValue({
      id: "video-test",
      startedAt: new Date("2026-05-05T12:00:00.000Z")
    });
    mocks.videoUpdate.mockResolvedValue({});
    mocks.saveRemoteVideoLocally.mockResolvedValue("/generated/video-test.mp4");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete process.env.VIDEO_ACCESS_CODE;
    delete process.env.APP_BASE_URL;
  });

  it("creates a pending video from the higher quality variant only", async () => {
    const { POST } = await import("../route");
    mocks.generateSeedanceVideo.mockResolvedValue({
      videoUrl: "https://cdn.example.com/video.mp4",
      modelId: "bytedance/seedance-2.0-fast/image-to-video",
      providerJobId: "wavespeed-job"
    });

    const response = await POST(new Request("http://test.local/api/videos", {
      method: "POST",
      body: JSON.stringify(requestBody)
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ videoId: "video-test" });
    expect(mocks.videoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: "req-test",
        sourceResultId: "result-1",
        sourceImageUrl: "https://pendant.example.com/generated/req-test-v1.png",
        prompt: "video prompt",
        modelId: "bytedance/seedance-2.0-fast/image-to-video",
        status: "pending",
        startedAt: new Date("2026-05-05T12:00:00.000Z")
      })
    });

    await vi.waitFor(() => {
      expect(mocks.generateSeedanceVideo).toHaveBeenCalledWith({
        imageUrl: "https://pendant.example.com/generated/req-test-v1.png",
        prompt: "video prompt"
      });
    });
    expect(mocks.videoUpdate).toHaveBeenCalledWith({
      where: { id: "video-test" },
      data: expect.objectContaining({
        videoUrl: "/generated/video-test.mp4",
        remoteVideoUrl: "https://cdn.example.com/video.mp4",
        providerJobId: "wavespeed-job",
        status: "succeeded"
      })
    });
  });

  it("falls back to forwarded host headers when APP_BASE_URL is missing", async () => {
    const { POST } = await import("../route");
    delete process.env.APP_BASE_URL;
    mocks.generateSeedanceVideo.mockResolvedValue({
      videoUrl: "https://cdn.example.com/video.mp4",
      modelId: "bytedance/seedance-2.0-fast/image-to-video",
      providerJobId: "wavespeed-job"
    });

    const response = await POST(new Request("http://internal-render/api/videos", {
      method: "POST",
      headers: {
        "x-forwarded-host": "mvp-jewelry-app2.onrender.com",
        "x-forwarded-proto": "https"
      },
      body: JSON.stringify(requestBody)
    }));

    expect(response.status).toBe(201);
    expect(mocks.videoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceImageUrl: "https://mvp-jewelry-app2.onrender.com/generated/req-test-v1.png"
      })
    });
  });

  it("rejects invalid access codes", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/videos", {
      method: "POST",
      body: JSON.stringify({ ...requestBody, accessCode: "WRONG" })
    }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toMatch(/invalid access code/i);
    expect(mocks.videoCreate).not.toHaveBeenCalled();
  });

  it("rejects when the higher quality draft is not ready", async () => {
    const { POST } = await import("../route");
    mocks.requestFindUnique.mockResolvedValue({
      id: "req-test",
      productType: "name",
      Results: [{ id: "result-2", variant: 2, status: "succeeded", imageUrl: "/generated/req-test-v2.png" }]
    });

    const response = await POST(new Request("http://test.local/api/videos", {
      method: "POST",
      body: JSON.stringify(requestBody)
    }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/higher quality draft/i);
    expect(mocks.videoCreate).not.toHaveBeenCalled();
  });
});

describe("/api/videos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns video status, seconds, and source metadata", async () => {
    const { GET } = await import("../[id]/route");
    mocks.videoFindUnique.mockResolvedValue({
      id: "video-test",
      requestId: "req-test",
      sourceResultId: "result-1",
      sourceImageUrl: "https://pendant.example.com/generated/req-test-v1.png",
      videoUrl: "/generated/video-test.mp4",
      remoteVideoUrl: "https://cdn.example.com/video.mp4",
      modelId: "bytedance/seedance-2.0-fast/image-to-video",
      providerJobId: "wavespeed-job",
      status: "succeeded",
      error: null,
      durationMs: 7250,
      request: { id: "req-test", productType: "name", styleId: "king", text: "GTA6" }
    });

    const response = await GET(new Request("http://test.local/api/videos/video-test"), {
      params: { id: "video-test" }
    });
    const json = await response.json();

    expect(json).toMatchObject({
      id: "video-test",
      requestId: "req-test",
      sourceResultId: "result-1",
      videoUrl: "/generated/video-test.mp4",
      remoteVideoUrl: "https://cdn.example.com/video.mp4",
      status: "succeeded",
      durationMs: 7250,
      durationSeconds: 7.25,
      done: true
    });
  });
});
