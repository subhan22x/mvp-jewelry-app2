import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ configured: vi.fn(), owner: vi.fn() }));
vi.mock("@/src/lib/supabase/env", () => ({ isSupabaseAuthConfigured: mocks.configured }));
vi.mock("@/src/lib/auth/owner-context", () => ({ getOwnerContext: mocks.owner }));

import { requestNotificationAudience } from "../origin";

describe("notification request origin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured.mockReturnValue(true);
    mocks.owner.mockResolvedValue({ accountId: "account-a", accountIds: ["account-a", "account-b"] });
  });

  it("excludes an authenticated owner across every active Account they own", async () => {
    await expect(requestNotificationAudience("account-b")).resolves.toBe("owner");
    await expect(requestNotificationAudience("account-c")).resolves.toBe("customer");
  });

  it("defaults to customer when authenticated ownership cannot be resolved", async () => {
    mocks.owner.mockResolvedValue(null);
    await expect(requestNotificationAudience("account-a")).resolves.toBe("customer");
  });
});
