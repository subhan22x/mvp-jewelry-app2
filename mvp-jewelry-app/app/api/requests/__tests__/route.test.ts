import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestCreate: vi.fn(),
  requestFindUnique: vi.fn(),
  resultCreate: vi.fn(),
  resultUpdate: vi.fn(),
  buildVariants: vi.fn(),
  generateImage: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    request: {
      create: mocks.requestCreate,
      findUnique: mocks.requestFindUnique
    },
    result: {
      create: mocks.resultCreate,
      update: mocks.resultUpdate
    }
  }
}));

vi.mock("@/lib/styles/builder", () => ({
  buildVariants: mocks.buildVariants
}));

vi.mock("@/lib/styles/connector", () => ({
  generateImage: mocks.generateImage
}));

const requestBody = {
  userId: "demo",
  styleId: "jwae",
  text: "Aurora",
  twoTone: true,
  primaryMetal: "yellow_gold",
  secondaryMetal: "white_gold",
  emblem: "heart"
};

describe("/api/requests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.requestCreate.mockResolvedValue({ id: "req-test" });
    mocks.resultCreate.mockImplementation(({ data }) =>
      Promise.resolve({
        id: `attempt-${data.variant}`,
        startedAt: data.startedAt
      })
    );
    mocks.resultUpdate.mockResolvedValue({});
    mocks.buildVariants.mockReturnValue([
      { variant: 1, prompt: "prompt 1", attachments: [] },
      { variant: 2, prompt: "prompt 2", attachments: [] }
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("records whether each image generation happened and how many seconds it took", async () => {
    const { POST } = await import("../route");

    mocks.generateImage.mockImplementation(({ variant }) =>
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (variant === 1) {
            resolve({ imageUrl: "/generated/req-test-v1.png", modelId: "model-a" });
            return;
          }
          reject(new Error("Provider failed"));
        }, variant === 1 ? 2500 : 1250);
      })
    );

    const response = await POST(new Request("http://test.local/api/requests", {
      method: "POST",
      body: JSON.stringify(requestBody)
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ requestId: "req-test" });
    expect(mocks.resultCreate).toHaveBeenCalledTimes(2);
    expect(mocks.resultCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        requestId: "req-test",
        variant: 1,
        prompt: "prompt 1",
        status: "pending",
        startedAt: new Date("2026-05-01T12:00:00.000Z")
      })
    });

    await vi.advanceTimersByTimeAsync(1250);
    await vi.waitFor(() => {
      expect(mocks.resultUpdate).toHaveBeenCalledWith({
        where: { id: "attempt-2" },
        data: expect.objectContaining({
          status: "failed",
          error: "Provider failed",
          durationMs: 1250
        })
      });
    });

    await vi.advanceTimersByTimeAsync(1250);
    await vi.waitFor(() => {
      expect(mocks.resultUpdate).toHaveBeenCalledWith({
        where: { id: "attempt-1" },
        data: expect.objectContaining({
          status: "succeeded",
          imageUrl: "/generated/req-test-v1.png",
          modelId: "model-a",
          durationMs: 2500
        })
      });
    });
  });

  it("accepts plain pendant requests and calls the prompt builder with plain fields", async () => {
    const { POST } = await import("../route");

    const plainBody = {
      userId: "demo",
      pendantFinish: "plain",
      styleId: "plain_style_1",
      text: "Aurora",
      plainColor: "rose_gold",
      plainMetal: "gold",
      plainKarat: "14k",
      plainChain: "snake"
    };

    const response = await POST(new Request("http://test.local/api/requests", {
      method: "POST",
      body: JSON.stringify(plainBody)
    }));

    expect(response.status).toBe(201);
    expect(mocks.requestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        pendantFinish: "plain",
        styleId: "plain_style_1",
        primaryMetal: "rose_gold",
        emblem: "none",
        plainColor: "rose_gold",
        plainMetal: "gold",
        plainKarat: "14k",
        plainChain: "snake",
        metalType: null,
        stoneType: null
      })
    });
    expect(mocks.buildVariants).toHaveBeenCalledWith(expect.objectContaining(plainBody), expect.any(Object));
  });

  it("rejects solid-gold plain pendant requests without karat", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/requests", {
      method: "POST",
      body: JSON.stringify({
        userId: "demo",
        pendantFinish: "plain",
        styleId: "plain_style_1",
        text: "Aurora",
        plainColor: "gold",
        plainMetal: "gold",
        plainChain: "rope"
      })
    }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/plainKarat/i);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("rejects plain pendant requests without a chain style", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/requests", {
      method: "POST",
      body: JSON.stringify({
        userId: "demo",
        pendantFinish: "plain",
        styleId: "plain_style_1",
        text: "Aurora",
        plainColor: "gold",
        plainMetal: "gold_plated"
      })
    }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/plainChain/i);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("does not require karat for gold plated plain pendants", async () => {
    const { POST } = await import("../route");

    const response = await POST(new Request("http://test.local/api/requests", {
      method: "POST",
      body: JSON.stringify({
        userId: "demo",
        pendantFinish: "plain",
        styleId: "plain_style_1",
        text: "Aurora",
        plainColor: "gold",
        plainMetal: "gold_plated",
        plainChain: "cable"
      })
    }));

    expect(response.status).toBe(201);
    expect(mocks.requestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        plainMetal: "gold_plated",
        plainKarat: null,
        plainChain: "cable"
      })
    });
  });
});

describe("/api/requests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports generation attempts, seconds, and done once every attempt finished or failed", async () => {
    const { GET } = await import("../[id]/route");

    mocks.requestFindUnique.mockResolvedValue({
      id: "req-test",
      styleId: "jwae",
      text: "Aurora",
      twoTone: true,
      primaryMetal: "yellow_gold",
      secondaryMetal: "white_gold",
      emblem: "heart",
      Results: [
        {
          variant: 1,
          status: "succeeded",
          imageUrl: "/generated/req-test-v1.png",
          modelId: "model-a",
          error: null,
          durationMs: 2500
        },
        {
          variant: 2,
          status: "failed",
          imageUrl: null,
          modelId: null,
          error: "Provider failed",
          durationMs: 1250
        }
      ]
    });

    const response = await GET(new Request("http://test.local/api/requests/req-test"), {
      params: { id: "req-test" }
    });
    const json = await response.json();

    expect(json.done).toBe(true);
    expect(json.generation).toEqual({
      total: 2,
      pending: 0,
      succeeded: 1,
      failed: 1
    });
    expect(json.results).toEqual([
      {
        variant: 1,
        imageUrl: "/generated/req-test-v1.png",
        modelId: "model-a",
        durationSeconds: 2.5
      }
    ]);
    expect(json.attempts).toEqual([
      expect.objectContaining({
        variant: 1,
        status: "succeeded",
        durationMs: 2500,
        durationSeconds: 2.5
      }),
      expect.objectContaining({
        variant: 2,
        status: "failed",
        error: "Provider failed",
        durationMs: 1250,
        durationSeconds: 1.25
      })
    ]);
  });
});
