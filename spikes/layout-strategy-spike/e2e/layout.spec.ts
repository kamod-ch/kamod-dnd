import { expect, test, type Page } from "@playwright/test";

async function drag(
  page: Page,
  fromTestId: string,
  toTestId: string,
  toward: "horizontal-end" | "vertical-end" | "center",
) {
  const source = page.getByTestId(fromTestId);
  const target = page.getByTestId(toTestId);
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox && targetBox).toBeTruthy();
  const x =
    toward === "horizontal-end"
      ? targetBox!.x + targetBox!.width - 12
      : targetBox!.x + targetBox!.width / 2;
  const y =
    toward === "vertical-end"
      ? targetBox!.y + targetBox!.height - 8
      : targetBox!.y + targetBox!.height / 2;
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 20 });
  await expect(page.getByRole("status")).not.toContainText("Picked up");
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector("[data-testid='title']");
});

test("horizontal LTR pointer moves toward the visual end", async ({ page }) => {
  await drag(page, "handle-ltr-a", "item-ltr-c", "horizontal-end");
  await expect(page.getByTestId("order-ltr")).toHaveText("LTR: ltr-b,ltr-c,ltr-a");
  await expect(page.getByTestId("adapter-intent")).toContainText("ltr-a -> ltr@");
  const order = await page
    .getByTestId("bar-ltr")
    .locator("[data-item]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-item")));
  expect(order).toEqual(["ltr-b", "ltr-c", "ltr-a"]);
});

test("horizontal RTL keeps DOM order and moves logically", async ({ page }) => {
  const bar = page.getByTestId("bar-rtl");
  const boxes = await bar.locator("[data-item]").evaluateAll((els) =>
    els.map((el) => ({
      id: el.getAttribute("data-item"),
      x: el.getBoundingClientRect().x,
    })),
  );
  expect(boxes.map((box) => box.id)).toEqual(["rtl-a", "rtl-b", "rtl-c"]);
  expect(boxes[0]!.x).toBeGreaterThan(boxes[2]!.x);

  await page.getByTestId("after-rtl-a").click();
  await expect(page.getByTestId("order-rtl")).toHaveText("RTL: rtl-b,rtl-a,rtl-c");
  const moved = await page.getByTestId("item-rtl-a").boundingBox();
  const first = await page.getByTestId("item-rtl-b").boundingBox();
  expect(moved && first).toBeTruthy();
  expect(moved!.x).toBeLessThan(first!.x);
});

test("vertical reorder stays on the engine index", async ({ page }) => {
  await drag(page, "handle-v-a", "item-v-c", "vertical-end");
  await expect(page.getByTestId("order-vertical")).not.toHaveText("Vertical: v-a,v-b,v-c");
  await expect(page.getByTestId("engine-intent")).toContainText("v-a -> vertical@");
});

test("transfers into another horizontal list and an empty target", async ({ page }) => {
  await drag(page, "handle-left-a", "item-right-a", "horizontal-end");
  await expect(page.getByTestId("order-right")).toContainText("left-a");
  await drag(page, "handle-left-b", "empty-list", "center");
  await expect(page.getByTestId("order-empty")).toContainText("left-b");
});

test("scrolls a horizontal strip when the pointer rests on the end edge", async ({ page }) => {
  const scroll = page.getByTestId("scroll-strip");
  await scroll.scrollIntoViewIfNeeded();
  const metrics = await scroll.evaluate((el) => {
    const box = el.getBoundingClientRect();
    return {
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      x: box.x,
      y: box.y,
      height: box.height,
    };
  });
  expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth + 40);
  const handle = page.getByTestId("handle-strip-0");
  const handleBox = await handle.boundingBox();
  expect(handleBox).toBeTruthy();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(metrics.x + metrics.clientWidth - 24, metrics.y + metrics.height / 2, {
    steps: 20,
  });
  await expect
    .poll(async () => scroll.evaluate((el) => (el as HTMLElement).scrollLeft), { timeout: 8_000 })
    .toBeGreaterThan(20);
  await page.mouse.up();
});

test("uniform and variable grids disagree about the next cell", async ({ page }) => {
  await expect(page.getByTestId("cell-g-b")).toHaveAttribute("data-after", "g-c");
  await expect(page.getByTestId("cell-g-b")).toHaveAttribute("data-below", "g-d");
  await expect(page.getByTestId("cell-wide")).toHaveAttribute("data-after", "span-left");
  await expect(page.getByTestId("cell-wide")).toHaveAttribute("data-below", "span-left,span-right");
});

test("before on the first item does not change order", async ({ page }) => {
  await page.getByTestId("before-ltr-a").click();
  await expect(page.getByTestId("order-ltr")).toHaveText("LTR: ltr-a,ltr-b,ltr-c");
  await page.getByTestId("after-ltr-c").click();
  await expect(page.getByTestId("order-ltr")).toHaveText("LTR: ltr-a,ltr-b,ltr-c");
});
