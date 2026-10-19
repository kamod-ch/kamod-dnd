import { expect, test, type Page } from "@playwright/test";

function libraryStatus(page: Page) {
  return page.getByRole("status").last();
}

async function drag(
  page: Page,
  fromTestId: string,
  toTestId: string,
  toward: "vertical-end" | "center",
  status: string | RegExp,
) {
  const source = page.getByTestId(fromTestId);
  const target = page.getByTestId(toTestId);
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox && targetBox).toBeTruthy();
  const x = targetBox!.x + targetBox!.width / 2;
  const y =
    toward === "vertical-end"
      ? targetBox!.y + targetBox!.height - 8
      : targetBox!.y + targetBox!.height / 2;
  await page.mouse.move(sourceBox!.x + 12, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 20 });
  await expect(libraryStatus(page)).toContainText(status);
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("[data-testid='title']");
});

test("pointer moves a non-contiguous group inside one column", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c4").check();
  await drag(page, "handle-c1", "card-c4", "center", /position [2-9]/);
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c2,c1,c4");
  await expect(page.getByTestId("group-status")).toHaveText("Moved 2 cards to To do.");
  await expect(page.getByTestId("pickup")).toContainText(
    "Picked up 2 cards: Write spec, blocked release.",
  );
});

test("pointer transfers a group from two columns into an empty column", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c3").check();
  await drag(page, "handle-c1", "empty-done", "center", "to Done");
  await expect(page.getByTestId("order-done")).toHaveText("Done: c1,c3");
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c2,c4");
  await expect(page.getByTestId("order-doing")).toHaveText("Doing: none");
});

test("a blocked member rejects the whole group", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c4").check();
  await drag(page, "handle-c1", "empty-done", "center", "to Done");
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c1,c2,c4");
  await expect(page.getByTestId("order-done")).toHaveText("Done: none");
  await expect(page.getByTestId("group-status")).toHaveText("Rejected 2 cards. Nothing moved.");
  await expect(libraryStatus(page)).toContainText("Cancelled moving Write spec.");
});

test("keyboard moves the selection and focuses the first handle", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c2").check();
  await page.getByTestId("to-doing").click();
  await expect(page.getByTestId("order-doing")).toHaveText("Doing: c3,c1,c2");
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c4");
  await expect(page.getByTestId("group-status")).toHaveText("Moved 2 cards to Doing.");
  await expect(page.getByTestId("handle-c1")).toBeFocused();
});

test("undo restores the lists after a group move", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c2").check();
  await page.getByTestId("to-doing").click();
  await page.getByTestId("undo").click();
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c1,c2,c4");
  await expect(page.getByTestId("order-doing")).toHaveText("Doing: c3");
  await expect(page.getByTestId("group-status")).toHaveText("Undid the last move.");
});

test("escape cancels a group drag", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c2").check();
  const handle = page.getByTestId("handle-c1");
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + 12, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 40, box!.y + 40, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c1,c2,c4");
  await expect(libraryStatus(page)).toContainText("Cancelled moving Write spec.");
});

test("shrinking the selection during the drag commits only the cards still selected", async ({
  page,
}) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c2").check();
  await page.getByTestId("select-c4").check();
  const source = page.getByTestId("handle-c1");
  const target = page.getByTestId("card-c2");
  await source.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox && targetBox).toBeTruthy();
  await page.mouse.move(sourceBox!.x + 12, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height - 8, {
    steps: 20,
  });
  await expect(libraryStatus(page)).toContainText(/position [2-9]/);
  await page.evaluate(() => window.__select?.(["c1", "c4"]));
  await expect(page.getByTestId("selection-count")).toHaveText("Selected: 2");
  await page.mouse.up();
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c2,c1,c4");
  await expect(page.getByTestId("group-status")).toHaveText("Moved 2 cards to To do.");
});

test("removing the dragged card from the selection rejects the batch", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c2").check();
  const source = page.getByTestId("handle-c1");
  const target = page.getByTestId("empty-done");
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox && targetBox).toBeTruthy();
  await page.mouse.move(sourceBox!.x + 12, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + 20, { steps: 20 });
  await expect(libraryStatus(page)).toContainText("to Done");
  await page.evaluate(() => window.__select?.(["c2"]));
  await expect(page.getByTestId("selection-count")).toHaveText("Selected: 1");
  await page.mouse.up();
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c1,c2,c4");
  await expect(page.getByTestId("order-done")).toHaveText("Done: none");
  await expect(page.getByTestId("group-status")).toHaveText("Rejected the batch. Nothing moved.");
});

test("a card that is not selected still moves by itself", async ({ page }) => {
  await drag(page, "handle-c3", "empty-done", "center", "to Done");
  await expect(page.getByTestId("order-done")).toHaveText("Done: c3");
  await expect(page.getByTestId("order-doing")).toHaveText("Doing: none");
});

test("keyboard rejection leaves every column unchanged", async ({ page }) => {
  await page.getByTestId("select-c1").check();
  await page.getByTestId("select-c4").check();
  await page.getByTestId("to-done").click();
  await expect(page.getByTestId("order-todo")).toHaveText("To do: c1,c2,c4");
  await expect(page.getByTestId("order-done")).toHaveText("Done: none");
  await expect(page.getByTestId("group-status")).toHaveText("Rejected 2 cards. Nothing moved.");
});
