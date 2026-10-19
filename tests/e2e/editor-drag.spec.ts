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

  test("releasing outside the list keeps the original order", async ({ page }) => {
    const orderOf = () =>
      page
        .locator("[data-testid^='block-']")
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-testid")).join(","));
    const initial = await orderOf();

    const handle = page.getByTestId("handle-b1");
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);

    const target = page.getByTestId("handle-b3");
    const targetBox = await target.boundingBox();
    expect(targetBox).toBeTruthy();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height + 4,
      {
        steps: 20,
      },
    );
    await expect(page.getByTestId("block-b1")).toHaveCSS("opacity", "0.5");

    const titleBox = await page.getByTestId("editor-title").boundingBox();
    const listBox = await page.getByTestId("editor-list").boundingBox();
    expect(titleBox).toBeTruthy();
    expect(listBox).toBeTruthy();
    expect(titleBox!.y + titleBox!.height).toBeLessThan(listBox!.y);
    const outside = { x: 8, y: titleBox!.y + titleBox!.height / 2 };
    expect(outside.x).toBeLessThan(listBox!.x);
    await page.mouse.move(outside.x, outside.y, { steps: 25 });
    const overList = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const list = document.querySelector("[data-testid='editor-list']");
      return !!el && !!list && list.contains(el);
    }, outside);
    expect(overList).toBe(false);
    await page.mouse.up();

    await expect(page.getByTestId("block-b1")).toHaveCSS("opacity", "1");
    await expect.poll(orderOf).toBe(initial);
  });

  test("escape does not remove blocks", async ({ page }) => {
    const count = await page.locator("[data-testid^='block-']").count();
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-testid^='block-']")).toHaveCount(count);
  });
});
