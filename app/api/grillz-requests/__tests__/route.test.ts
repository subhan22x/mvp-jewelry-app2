// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ createRequest: vi.fn(), createResult: vi.fn(), updateResult: vi.fn(), generate: vi.fn(), quote: vi.fn(), consume: vi.fn(), tasks: [] as Promise<unknown>[] }));
vi.mock('@/server/db/client', () => ({ prisma: { request: { create: m.createRequest }, result: { create: m.createResult, update: m.updateResult } } }));
vi.mock('@/lib/styles/connector', () => ({ generateImage: m.generate }));
vi.mock('@/src/lib/account', () => ({ getDefaultAccountId: () => 'qa-account' }));
vi.mock('@/src/lib/tenant', () => ({ resolveAccountIdFromSlug: async () => 'qa-account' }));
vi.mock('@/src/lib/billing/signup-credits', () => ({ withSignupGeneration: (handler: unknown) => handler, signupGenerationUserId: (id: string) => id, bindSignupGeneration: async () => {} }));
vi.mock('@/src/lib/platform/background', () => ({ scheduleBackgroundTask: (task: Promise<unknown>) => m.tasks.push(task) }));
vi.mock('@/src/lib/notifications/origin', () => ({ requestNotificationAudience: async () => 'customer' }));
vi.mock('@/src/lib/usage', () => ({ ensureUsageAvailable: async () => {}, consumeUsageCredit: m.consume, usageErrorResponse: () => null }));
vi.mock('@/src/lib/quotes/ensure-draft-quote', () => ({ ensureDraftQuoteForRequest: m.quote }));
vi.mock('@/src/lib/qr-kits/service', () => ({ QrKitAttributionError: class extends Error {}, resolveQrKitAttributionFromRequest: async () => ({ qrKitId: null }) }));
import { POST } from '../route';
const styles = [ ['luxury_silver', 'Luxury Silver'], ['gold_silver', 'Gold Silver'], ['rose_gold', 'Rose Gold'], ['rainbow_gemstone', 'Rainbow Gemstone'], ['iced_diamond', 'Iced Diamond'], ['gold_hearts', 'Gold Hearts'] ];
describe('new Grillz preset API pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks(); m.tasks.length = 0;
    m.createRequest.mockResolvedValue({ id: 'qa-request' });
    m.createResult.mockImplementation(async ({data}) => ({ id: 'qa-result', ...data }));
    m.updateResult.mockResolvedValue({ id: 'qa-result' });
    m.generate.mockResolvedValue({ imageUrl: '/qa-image.png', modelId: 'simulated-provider' });
    m.quote.mockResolvedValue({}); m.consume.mockResolvedValue({});
  });
  it.each(styles)('accepts %s and persists the exact prompt and successful result', async (id, label) => {
    const response = await POST(new Request('http://localhost/api/grillz-requests', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({userId: 'qa', styleId: id, selectedTeeth: ['U4', 'U5', 'L6'], goldColor: 'white_gold', stoneType: 'natural_diamonds', diamondQuality: 'vvs'})}));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({requestId: 'qa-request'});
    await Promise.all(m.tasks);
    expect(m.createRequest).toHaveBeenCalledWith({data: expect.objectContaining({productType: 'grillz', styleId: `grillz_${id}`, grillzStyleLabel: label, grillzStyleType: 'preset', primaryMetal: 'white_gold'})});
    const generation = m.generate.mock.calls[0][0];
    expect(generation.prompt).toContain(`Product: ${label}`);
    expect(generation.prompt).toContain('upper teeth 4, 5; lower teeth 6');
    expect(generation.prompt).toContain('Gold color: White Gold');
    expect(generation.prompt).not.toMatch(/{{.*?}}/);
    expect(generation.attachments).toEqual([]);
    expect(m.createResult.mock.calls[0][0].data.prompt).toBe(generation.prompt);
    expect(m.updateResult).toHaveBeenCalledWith({where: {id: 'qa-result'}, data: expect.objectContaining({status: 'succeeded', imageUrl: '/qa-image.png'})});
    expect(m.consume).toHaveBeenCalledTimes(1);
    expect(m.quote).toHaveBeenCalledWith('qa-request');
  });
});
