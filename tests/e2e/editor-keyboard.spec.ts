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

  test("restores handle focus and announces the block label", async ({ page }) => {
    await page.getByTestId("block-b2").getByRole("button", { name: "Down" }).click();
    const handle = page.getByTestId("handle-b2");
    await expect(handle).toBeFocused();
    const status = page.getByRole("status");
    await expect(status).toContainText("Paragraph with variable height.");
    await expect(status).not.toContainText("b2");
  });

  test("Space, ArrowDown, and Enter on the handle reorder blocks", async ({ page }) => {
    const before = await page
      .locator("[data-testid^='block-']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    const handle = page.getByTestId("handle-b1");
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(handle).toBeFocused();
    const after = await page
      .locator("[data-testid^='block-']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")));
    expect(after.indexOf("block-b1")).toBeGreaterThan(before.indexOf("block-b1")!);
    await expect(page.getByRole("status")).toContainText("Chapter title");
  });

  test("escape restores the dragged handle", async ({ page }) => {
    const handle = page.getByTestId("handle-b1");
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 80, { steps: 12 });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    await page.keyboard.press("Escape");
    await expect(handle).toBeFocused();
    await expect(page.getByRole("status")).toContainText("Chapter title");
    await page.mouse.up();
  });
});
