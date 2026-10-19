import { expect, test } from "@playwright/test";

test.describe("controlled order changes", () => {
  test("an external source-order change cancels the drag", async ({ page }) => {
    await page.goto("/?fixture=controlled-order");
    await expect(page.getByTestId("order-controlled")).toHaveText("a,b");

    const handle = page.getByTestId("handle-controlled-a");
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    const target = page.getByTestId("item-controlled-b");
    const targetBox = await target.boundingBox();
    expect(targetBox).toBeTruthy();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height - 8,
      { steps: 20 },
    );
    await page.evaluate(() => {
      (window as Window & { __mutateOrder?: () => void }).__mutateOrder?.();
    });
    await expect(page.getByRole("status")).toContainText("Cancelled");
    await page.mouse.up();
    await expect(page.getByTestId("order-controlled")).toHaveText("b,a");
  });
});
