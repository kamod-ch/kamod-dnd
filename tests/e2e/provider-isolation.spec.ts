import { expect, test } from "@playwright/test";

test.describe("provider isolation", () => {
  test("duplicate ids in two providers do not share a drag", async ({ page }) => {
    await page.goto("/?fixture=provider-isolation");
    await expect(page.getByTestId("order-a")).toHaveText("a,b");
    await expect(page.getByTestId("order-b")).toHaveText("a,b");

    async function reorder(name: string) {
      const handle = page.getByTestId(`handle-${name}-a`);
      const box = await handle.boundingBox();
      expect(box).toBeTruthy();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(50);
      const target = page.getByTestId(`item-${name}-b`);
      const targetBox = await target.boundingBox();
      expect(targetBox).toBeTruthy();
      await page.mouse.move(
        targetBox!.x + targetBox!.width / 2,
        targetBox!.y + targetBox!.height - 8,
        { steps: 20 },
      );
      const status = page.getByRole("status").nth(name === "a" ? 0 : 1);
      await expect(status).toContainText("position 2");
      await page.mouse.up();
      await expect(page.getByTestId(`order-${name}`)).toHaveText("b,a");
    }

    await reorder("a");
    await expect(page.getByTestId("order-b")).toHaveText("a,b");
    const orderA = await page.getByTestId("order-a").textContent();
    await reorder("b");
    await expect(page.getByTestId("order-a")).toHaveText(orderA ?? "");
    await expect(page.getByTestId("order-b")).not.toHaveText("a,b");
  });
});
