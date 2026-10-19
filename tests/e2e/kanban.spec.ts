import { expect, test } from "@playwright/test";

const kanbanBase = "http://localhost:14274";

test.describe("kanban board", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${kanbanBase}/`);
    await page.waitForSelector('[data-testid="kanban-title"]', { timeout: 30_000 });
  });

  test("transfers a card into empty done column via keyboard", async ({ page }) => {
    await expect(page.getByTestId("empty-done")).toBeVisible();
    await page.getByTestId("move-c1-to-done").click();
    await expect(page.getByTestId("handle-c1")).toBeFocused();
    const status = page.getByRole("status");
    await expect(status).toContainText("Write spec");
    await expect(status).toContainText("Done");
    await expect(status).not.toContainText("c1");
    await expect(page.getByTestId("card-c1")).toBeVisible();
    await expect(page.getByTestId("column-done").getByTestId("card-c1")).toBeVisible();
    await expect(page.getByTestId("column-todo").getByTestId("card-c1")).toHaveCount(0);
  });

  test("drop rule rejects move to done when title contains blocked", async ({ page }) => {
    await page.getByTestId("move-c4-to-done").click();
    await expect(page.getByTestId("handle-c4")).not.toBeFocused();
    await expect(page.getByTestId("column-todo").getByTestId("card-c4")).toBeVisible();
    await expect(page.getByTestId("column-done").getByTestId("card-c4")).toHaveCount(0);
  });

  test("application undo restores prior column layout", async ({ page }) => {
    await page.getByTestId("move-c1-to-doing").click();
    await expect(page.getByTestId("column-doing").getByTestId("card-c1")).toBeVisible();
    await page.getByTestId("undo-btn").click();
    await expect(page.getByTestId("column-todo").getByTestId("card-c1")).toBeVisible();
  });

  test("escape during pointer drag does not move cards", async ({ page }) => {
    const todoCards = page.getByTestId("column-todo").locator('[data-testid^="card-"]');
    const countBefore = await todoCards.count();
    const handle = page.getByTestId("handle-c2");
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(todoCards).toHaveCount(countBefore);
    await expect(page.getByTestId("column-done").locator('[data-testid^="card-"]')).toHaveCount(0);
  });
});
