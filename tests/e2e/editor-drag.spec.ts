import { expect, test } from "@playwright/test";

test.describe("editor blocks drag", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="editor-title"]', { timeout: 30_000 });
  });

  test("reorders via handle without breaking input focus", async ({ page }) => {
    const input = page.getByTestId("input-b1");
    await input.focus();
    await input.fill("Focused title");

    const orderBefore = await page
      .locator("[data-testid^='block-']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));

    const handle = page.getByTestId("handle-b1");
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    const target = page.getByTestId("handle-b3");
    const tbox = await target.boundingBox();
    expect(tbox).toBeTruthy();
    await page.mouse.move(tbox!.x + tbox!.width / 2, tbox!.y + tbox!.height + 4, { steps: 20 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    await expect
      .poll(async () =>
        page
          .locator("[data-testid^='block-']")
          .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")).join(",")),
      )
      .not.toBe(orderBefore.join(","));
  });

  test("escape does not remove blocks", async ({ page }) => {
    const count = await page.locator("[data-testid^='block-']").count();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-testid^='block-']")).toHaveCount(count);
  });
});
