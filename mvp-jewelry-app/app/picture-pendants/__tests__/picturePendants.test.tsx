import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PicturePendantsBuilder from '../page';

const mockPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush })
}));

vi.mock('react-international-phone', () => ({
  PhoneInput: ({ value, onChange, inputProps }: any) =>
    <input {...inputProps} type="tel" value={value} onChange={(e: any) => onChange(e.target.value)} placeholder="Phone number" />
}));

vi.mock('@/lib/assets', () => ({
  picturePendantStyles: [
    { id: 'oval', label: 'Oval Frame', src: '/samples/Gemini_Generated_Image_a8vnkga8vnkga8vn.png', available: true }
  ]
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockPostSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ requestId: 'picture-req' })
  });
}

function mockGetSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      id: 'picture-req',
      productType: 'picture',
      results: [{ variant: 1, imageUrl: '/generated/picture-req-v1.png' }],
      attempts: [{ variant: 1, status: 'succeeded', durationSeconds: 1.5 }],
      done: true
    })
  });
}

async function setup() {
  const user = userEvent.setup();
  await act(async () => { render(<PicturePendantsBuilder />); });
  return { user };
}

async function uploadPicture(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(['fake image'], 'portrait.png', { type: 'image/png' });
  await act(async () => {
    await user.upload(screen.getByLabelText(/select picture pendant image/i), file);
  });
  return file;
}

async function click(user: ReturnType<typeof userEvent.setup>, el: HTMLElement) {
  await act(async () => { await user.click(el); });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:picture-preview')
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn()
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('/picture-pendants', () => {
  it('keeps next disabled until an image is uploaded', async () => {
    await setup();

    expect(screen.getByRole('button', { name: /^next$/i })).toBeDisabled();
  });

  it('shows an uploaded image preview and enables next when a style is available', async () => {
    const { user } = await setup();
    await uploadPicture(user);

    expect(screen.getByAltText(/uploaded picture preview/i)).toHaveAttribute('src', 'blob:picture-preview');
    expect(screen.getByRole('button', { name: /^next$/i })).toBeEnabled();
  });

  it('does not show name-only controls', async () => {
    await setup();

    expect(screen.queryByText(/text on pendant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^emblem$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/diamond quality/i)).not.toBeInTheDocument();
  });

  it('moves to color and review after upload/style selection', async () => {
    const { user } = await setup();
    await uploadPicture(user);
    await click(user, screen.getByRole('button', { name: /^next$/i }));

    expect(screen.getByText(/select gold color/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^yellow gold$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^white gold$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^rose gold$/i })).toBeInTheDocument();
    expect(screen.getByText(/review your picture pendant/i)).toBeInTheDocument();
  });

  it('sends multipart form data to the picture request endpoint', async () => {
    const { user } = await setup();
    await uploadPicture(user);
    await click(user, screen.getByRole('button', { name: /^next$/i }));
    await click(user, screen.getByRole('button', { name: /^rose gold$/i }));
    mockPostSuccess();
    mockGetSuccess();

    await click(user, screen.getByRole('button', { name: /^generate$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/picture-requests', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }));
    });

    const [, init] = mockFetch.mock.calls[0];
    const body = init.body as FormData;
    expect(body.get('userId')).toBe('demo');
    expect(body.get('styleId')).toBe('oval');
    expect(body.get('primaryMetal')).toBe('rose_gold');
    expect(body.get('image')).toBeInstanceOf(File);
  });
});
