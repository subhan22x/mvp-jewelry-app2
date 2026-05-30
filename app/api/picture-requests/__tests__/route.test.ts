import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requestCreate: vi.fn(),
  resultCreate: vi.fn(),
  resultUpdate: vi.fn(),
  preparePictureComposite: vi.fn(),
  composePicturePendant: vi.fn(),
  saveGeneratedImage: vi.fn()
}));

vi.mock('@/server/db/client', () => ({
  prisma: {
    request: {
      create: mocks.requestCreate
    },
    result: {
      create: mocks.resultCreate,
      update: mocks.resultUpdate
    }
  }
}));

vi.mock('@/lib/picture-styles/compositor', () => ({
  preparePictureComposite: mocks.preparePictureComposite,
  composePicturePendant: mocks.composePicturePendant
}));

vi.mock('@/lib/styles/connector', () => ({
  saveGeneratedImage: mocks.saveGeneratedImage
}));

function fakeImageFile() {
  return {
    name: 'portrait.png',
    type: 'image/png',
    size: 10,
    arrayBuffer: async () => Buffer.from('fake image').buffer
  };
}

function pictureForm(file: any = fakeImageFile()) {
  const values = new Map<string, any>([
    ['userId', 'demo'],
    ['styleId', 'oval'],
    ['primaryMetal', 'rose_gold'],
    ['image', file]
  ]);
  return {
    get: (key: string) => values.get(key) ?? null
  } as unknown as FormData;
}

function requestWithForm(form: FormData) {
  return {
    formData: async () => form
  } as unknown as Request;
}

describe('/api/picture-requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mocks.requestCreate.mockResolvedValue({ id: 'picture-req' });
    mocks.resultCreate.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'picture-attempt',
        startedAt: data.startedAt
      })
    );
    mocks.resultUpdate.mockResolvedValue({});
    mocks.preparePictureComposite.mockReturnValue({
      variant: 1,
      prompt: 'picture prompt',
      style: {
        id: 'oval',
        label: 'Oval Frame',
        baseImage: 'public/picture-pendants/oval.jpg',
        maskImage: 'public/picture-pendants/oval_green.jpg'
      },
      uploadedImagePath: '/tmp/upload.png'
    });
    mocks.composePicturePendant.mockResolvedValue({
      buffer: Buffer.from('generated image'),
      mimeType: 'image/png'
    });
    mocks.saveGeneratedImage.mockResolvedValue('/generated/picture-req-v1.png');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates one picture request attempt and composites the image locally', async () => {
    const { POST } = await import('../route');

    const response = await POST(requestWithForm(pictureForm()));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ requestId: 'picture-req' });
    expect(mocks.preparePictureComposite).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'demo',
      styleId: 'oval',
      primaryMetal: 'rose_gold',
      uploadFileName: 'portrait.png',
      uploadedImagePath: expect.any(String)
    }));
    expect(mocks.requestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'demo',
        productType: 'picture',
        styleId: 'oval',
        text: 'portrait.png',
        twoTone: false,
        primaryMetal: 'rose_gold',
        secondaryMetal: null,
        emblem: 'none',
        uploadFileName: 'portrait.png'
      })
    });
    expect(mocks.resultCreate).toHaveBeenCalledTimes(1);
    expect(mocks.resultCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 'picture-req',
        variant: 1,
        prompt: 'picture prompt',
        status: 'pending',
        startedAt: expect.any(Date)
      })
    });
    expect(mocks.composePicturePendant).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'picture prompt',
      uploadedImagePath: '/tmp/upload.png'
    }));
    expect(mocks.saveGeneratedImage).toHaveBeenCalledWith({
      buffer: Buffer.from('generated image'),
      mimeType: 'image/png',
      requestId: 'picture-req',
      variant: 1
    });

    await vi.waitFor(() => {
      expect(mocks.resultUpdate).toHaveBeenCalledWith({
        where: { id: 'picture-attempt' },
        data: expect.objectContaining({
          status: 'succeeded',
          imageUrl: '/generated/picture-req-v1.png',
          modelId: 'sharp-green-mask-composite-v1',
          durationMs: expect.any(Number)
        })
      });
    });
  });

  it('rejects requests without an uploaded image', async () => {
    const { POST } = await import('../route');
    const form = new FormData();
    form.append('userId', 'demo');
    form.append('styleId', 'oval');
    form.append('primaryMetal', 'rose_gold');

    const response = await POST(requestWithForm(form));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/upload an image/i);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it('rejects when the selected picture style is not configured', async () => {
    const { POST } = await import('../route');
    mocks.preparePictureComposite.mockImplementation(() => {
      throw new Error('Picture pendant style is not configured: oval');
    });

    const response = await POST(requestWithForm(pictureForm()));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toMatch(/not configured/i);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });
});
