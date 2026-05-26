import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestFindUnique: vi.fn(),
  revisionCreate: vi.fn(),
  revisionUpdate: vi.fn(),
  generateImage: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    request: {
      findUnique: mocks.requestFindUnique
    },
    resultRevision: {
      create: mocks.revisionCreate,
      update: mocks.revisionUpdate
    }
  }
}));

vi.mock("@/lib/styles/connector", () => ({
  generateImage: mocks.generateImage
}));

describe("/api/requests/[id]/revisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(Buffer.from("source image"), {
        status: 200,
        headers: { "content-type": "image/png" }
      })
    ));

    mocks.requestFindUnique.mockResolvedValue({
      id: "req-test",
      accountId: "acct-test",
      Results: [
        {
          id: "result-1",
          status: "succeeded",
          imageUrl: "https://cdn.example.com/generated/source.png",
          prompt: "original pendant prompt"
        }
      ],
      ResultRevisions: []
    });
    mocks.revisionCreate.mockResolvedValue({
      id: "revision-1",
      revisionNumber: 1,
      status: "pending",
      durationMs: null
    });
    mocks.revisionUpdate.mockResolvedValue({});
    mocks.generateImage.mockResolvedValue({
      imageUrl: "/generated/req-test-v101.png",
      modelId: "gemini-3-pro-image-preview"
    });
  });

  it("sends the selected source image and revision text through image generation", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/requests/req-test/revisions", {
      method: "POST",
      body: JSON.stringify({
        sourceResultId: "result-1",
        prompt: "Make the crown larger"
      })
    }), { params: { id: "req-test" } });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      revisionId: "revision-1",
      revisionNumber: 1,
      status: "pending"
    }));

    await vi.waitFor(() => {
      expect(mocks.generateImage).toHaveBeenCalledWith(expect.objectContaining({
        requestId: "req-test",
        variant: 101,
        modelVariant: 1,
        attachments: [expect.stringMatching(/revision-source-revision-1\.png$/)]
      }));
    });

    const generateCall = mocks.generateImage.mock.calls[0][0];
    expect(generateCall.prompt).toContain("Make the crown larger");
    expect(generateCall.prompt).toContain("original pendant prompt");
    expect(fetch).toHaveBeenCalledWith(new URL("https://cdn.example.com/generated/source.png"));
    expect(mocks.revisionUpdate).toHaveBeenCalledWith({
      where: { id: "revision-1" },
      data: expect.objectContaining({
        imageUrl: "/generated/req-test-v101.png",
        status: "succeeded",
        error: null,
        modelId: "gemini-3-pro-image-preview",
        provider: "google"
      })
    });
  });
});
