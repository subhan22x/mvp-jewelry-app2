import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("renders hero copy and pendant cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dream it first" })).toBeVisible();
    await expect(page.getByRole("link", { name: /name/i })).toBeVisible();
    // Disabled cards present but not links
    await expect(page.getByText("Logo")).toBeVisible();
    await expect(page.getByText("Custom Design")).toBeVisible();
  });

  test("Name card links to /name", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /name/i }).click();
    await expect(page).toHaveURL("/name");
  });
});

test.describe("Name builder flow", () => {
  test("step 0 — next disabled until name entered", async ({ page }) => {
    await page.goto("/name");
    const next = page.getByRole("button", { name: /^next$/i });
    await expect(next).toBeDisabled();
    await page.getByPlaceholder("text on pendant...").fill("Aurora");
    await expect(next).toBeEnabled();
  });

  test("step 0 — uppercase button and style selection work", async ({ page }) => {
    await page.goto("/name");
    await page.getByPlaceholder("text on pendant...").fill("aurora");
    await page.getByRole("button", { name: /convert all text to uppercase/i }).click();
    await expect(page.getByPlaceholder("text on pendant...")).toHaveValue("AURORA");

    const styleCards = page.getByRole("button", { name: /pendant style/i });
    const second = styleCards.nth(1);
    await second.click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
  });

  test("can navigate steps 0 → 1 → 2 and back to 0", async ({ page }) => {
    await page.goto("/name");
    await page.getByPlaceholder("text on pendant...").fill("Aurora");
    await page.getByRole("button", { name: /^next$/i }).click();

    // Step 1: emblem & gold
    await expect(page.getByRole("heading", { name: "Emblem" })).toBeVisible();
    await page.getByRole("button", { name: /crown/i }).click();
    await expect(page.getByRole("button", { name: /crown/i })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^next$/i }).click();

    // Step 2: review — entered name and Crown should appear in summary
    await expect(page.getByText("Aurora")).toBeVisible();
    await expect(page.getByText("Crown")).toBeVisible();

    // Edit button returns to step 0 preserving the name
    await page.getByRole("button", { name: /^edit$/i }).click();
    await expect(page.getByPlaceholder("text on pendant...")).toHaveValue("Aurora");
  });

  test("step 2 — diamond quality can be toggled", async ({ page }) => {
    await page.goto("/name");
    await page.getByPlaceholder("text on pendant...").fill("Aurora");
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^next$/i }).click();

    await expect(page.getByRole("button", { name: /^vvs$/i })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /^vs$/i }).click();
    await expect(page.getByRole("button", { name: /^vs$/i })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^vvs$/i })).toHaveAttribute("aria-pressed", "false");
  });

  // Helper: mock POST (returns requestId) and GET poll (returns all 4 results immediately)
  async function mockGenerationApi(page: import("@playwright/test").Page, requestId = "e2e-test") {
    const results = [1, 2, 3, 4].map(v => ({
      variant: v,
      imageUrl: `/samples/Gemini_Generated_Image_7tlquz7tlquz7tlq.png`
    }));
    await page.route("/api/requests", async route => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ requestId }) });
      } else {
        await route.continue();
      }
    });
    await page.route(`/api/requests/${requestId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: requestId, results, done: true })
      });
    });
  }

  test("step 2 — accept calls API and transitions to results (mocked)", async ({ page }) => {
    await mockGenerationApi(page);
    await page.goto("/name");
    await page.getByPlaceholder("text on pendant...").fill("Aurora");
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^accept$/i }).click();

    await expect(page.getByText("Choose your favourite")).toBeVisible({ timeout: 10_000 });
    expect(await page.getByRole("button", { name: /^draft \d$/i }).count()).toBe(4);
  });

  test("step 4 — preview modal opens and closes", async ({ page }) => {
    await mockGenerationApi(page, "e2e-modal");
    await page.goto("/name");
    await page.getByPlaceholder("text on pendant...").fill("Aurora");
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^accept$/i }).click();
    await expect(page.getByText("Choose your favourite")).toBeVisible({ timeout: 10_000 });

    await page.getByLabel("Preview Draft 1").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByLabel("Close preview").click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("step 4 — back with generations shows confirm and returns to review", async ({ page }) => {
    await mockGenerationApi(page, "e2e-back");
    await page.goto("/name");
    await page.getByPlaceholder("text on pendant...").fill("Aurora");
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^next$/i }).click();
    await page.getByRole("button", { name: /^accept$/i }).click();
    await expect(page.getByText("Choose your favourite")).toBeVisible({ timeout: 10_000 });

    page.on("dialog", d => d.accept());
    await page.getByRole("button", { name: /^back$/i }).first().click();
    await expect(page.getByRole("button", { name: /^accept$/i })).toBeVisible();
  });
});
