import { expect, test } from "@playwright/test";

test.describe("editor keyboard moves", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="editor-title"]', { timeout: 30_000 });
  });

  test("move down button reorders blocks", async ({ page }) => {
    const before = await page
      .locator("[data-testid^='block-']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    const blockB3 = page.getByTestId("block-b3");
    await blockB3.getByRole("button", { name: "Up" }).click();
    const after = await page
      .locator("[data-testid^='block-']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    expect(after.indexOf("block-b3")).toBeLessThan(before.indexOf("block-b3")!);
  });

  test("handle stays focusable after keyboard move", async ({ page }) => {
    await page.getByTestId("block-b2").getByRole("button", { name: "Down" }).click();
    const handle = page.getByTestId("handle-b2");
    await handle.focus();
    await expect(handle).toBeFocused();
  });
});
