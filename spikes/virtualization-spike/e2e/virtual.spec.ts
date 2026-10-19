import { expect, test, type Page } from "@playwright/test";

async function drag(page: Page, fromTestId: string, toTestId: string) {
  const source = page.getByTestId(fromTestId);
  const target = page.getByTestId(toTestId);
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox && targetBox).toBeTruthy();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2, {
    steps: 15,
  });
  await expect(page.getByRole("status")).not.toContainText("Picked up");
  await page.mouse.up();
}

test.describe("virtualization spike", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector("[data-testid='scroll-main']");
  });

  test("mounts a window of a 10k list and records the unmounted-index gap", async ({ page }) => {
    await expect(page.getByTestId("row-row-500")).toHaveCount(0);
    const mounted = Number(await page.getByTestId("mounted-main").innerText());
    expect(mounted).toBeGreaterThan(5);
    expect(mounted).toBeLessThan(80);
    await expect(page.getByTestId("gap-main")).toContainText(
      "visual 500 library 10000 destination-mounted false",
    );
  });

  test("reorders two mounted rows", async ({ page }) => {
    await drag(page, "handle-row-0", "handle-row-2");
    await expect(page.getByTestId("index-row-0")).not.toHaveText("Index row-0: 0");
    await expect(page.getByTestId("last-intent")).toContainText("row-0 -> main@");
  });

  test("moves a mounted row into the other virtual list and into an empty list", async ({
    page,
  }) => {
    const sideBox = await page.getByTestId("row-side-0").boundingBox();
    const source = page.getByTestId("handle-row-1");
    const sourceBox = await source.boundingBox();
    expect(sourceBox && sideBox).toBeTruthy();
    await page.mouse.move(
      sourceBox!.x + sourceBox!.width / 2,
      sourceBox!.y + sourceBox!.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(sideBox!.x + sideBox!.width / 2, sideBox!.y + sideBox!.height - 8, {
      steps: 20,
    });
    await expect(page.getByRole("status")).toContainText("to side");
    await page.mouse.up();
    await expect(page.getByTestId("side-ids")).toContainText("row-1");
    await expect(page.getByTestId("index-row-1")).toHaveText("Index row-1: -1");

    const empty = page.getByTestId("empty-list");
    await empty.scrollIntoViewIfNeeded();
    const emptyBox = await empty.boundingBox();
    const row2 = await page.getByTestId("handle-row-2").boundingBox();
    expect(emptyBox && row2).toBeTruthy();
    await page.mouse.move(row2!.x + row2!.width / 2, row2!.y + row2!.height / 2);
    await page.mouse.down();
    await page.mouse.move(emptyBox!.x + emptyBox!.width / 2, emptyBox!.y + emptyBox!.height / 2, {
      steps: 20,
    });
    await expect(page.getByRole("status")).toContainText("to empty");
    await page.mouse.up();
    await expect(page.getByTestId("last-intent")).toContainText("row-2 -> empty@");
    await expect(page.getByTestId("empty-ids")).toContainText("row-2");
  });

  test("escape cancels a pointer drag", async ({ page }) => {
    const handle = page.getByTestId("handle-row-0");
    const box = await handle.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 80, { steps: 12 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await expect(page.getByRole("status")).toContainText("Cancelled");
    await expect(page.getByTestId("index-row-0")).toHaveText("Index row-0: 0");
  });

  test("keyboard move keeps focus on the handle", async ({ page }) => {
    await page.getByTestId("kb-down-row-0").click();
    await expect(page.getByTestId("index-row-0")).toHaveText("Index row-0: 1");
    await expect(page.getByTestId("handle-row-0")).toBeFocused();
    await expect(page.getByRole("status")).toContainText("Item 0");
  });

  test("commits an unmounted index from the keyboard and scrolls it into view", async ({
    page,
  }) => {
    await page.getByTestId("jump-row-0").click();
    await expect(page.getByTestId("index-row-0")).toHaveText("Index row-0: 500");
    await expect(page.getByTestId("row-row-0")).toBeVisible();
    await expect(page.getByTestId("handle-row-0")).toBeFocused();
  });

  test("autoscroll unmounts the source row and cancels the drag", async ({ page }) => {
    await expect(page.getByTestId("row-row-30")).toHaveCount(0);
    const handle = page.getByTestId("handle-row-0");
    const scroll = page.getByTestId("scroll-main");
    const box = await handle.boundingBox();
    const scrollBox = await scroll.boundingBox();
    expect(box && scrollBox).toBeTruthy();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    const edgeY = scrollBox!.y + scrollBox!.height - 12;
    await page.mouse.move(scrollBox!.x + scrollBox!.width / 2, edgeY, { steps: 20 });
    await expect
      .poll(async () => scroll.evaluate((el) => (el as HTMLElement).scrollTop), { timeout: 8_000 })
      .toBeGreaterThan(200);
    await expect(page.getByRole("status")).toContainText("Cancelled");
    await expect(page.getByTestId("row-row-0")).toHaveCount(0);
    await expect(page.getByTestId("index-row-0")).toHaveText("Index row-0: 0");
    await page.mouse.up();
  });

  test("unmount clears the mounted rows", async ({ page }) => {
    await page.getByTestId("unmount").click();
    await expect(page.getByTestId("unmounted")).toBeVisible();
    await expect(page.getByTestId("scroll-main")).toHaveCount(0);
    await expect(page.getByTestId("row-row-0")).toHaveCount(0);
  });
});
