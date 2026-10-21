import { expect, test, type Locator, type Page } from "@playwright/test";

const treeBase = "http://localhost:14277";
const ROOT_SENTINEL = "__tree_root__";

async function startPointerDrag(page: Page, handle: Locator) {
  const box = await handle.boundingBox();
  expect(box).toBeTruthy();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  // Cross the browser's native drag threshold while still over the handle,
  // then wait until Pragmatic DnD has observed dragstart.
  await page.mouse.move(x + Math.min(8, box!.width / 4), y, { steps: 2 });
  await expect(page.getByRole("status")).toContainText("Picked up");
}

async function movePointer(page: Page, x: number, y: number, steps: number) {
  await page.mouse.move(x, y, { steps });
  // Pragmatic DnD coalesces drag updates per animation frame. Send one move
  // after that frame so the final pointer location is always observed.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.mouse.move(x + 1, y);
}

test.describe("tree example", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${treeBase}/`);
    await page.waitForSelector('[data-testid="tree-title"]', { timeout: 30_000 });
  });

  test("indent sibling under previous sibling and outdent back", async ({ page }) => {
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
    await page.getByTestId("kb-indent-c2").click();
    await expect(page.getByTestId("handle-c2")).toBeFocused();
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "c1");
    await expect(page.getByTestId("last-reject-main")).toHaveText("Last reject: none");
    await expect(page.getByRole("status")).toContainText("Child 2");

    await page.getByTestId("kb-outdent-c2").click();
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
  });

  test("moves a node into an initially empty child list", async ({ page }) => {
    await expect(page.getByTestId("empty-rB")).toBeVisible();
    await page.getByTestId("move-g1-to-rB-main").click();
    await expect(page.getByTestId("node-g1")).toHaveAttribute("data-parent", "rB");
    await expect(page.getByTestId("empty-rB")).toHaveCount(0);
    await expect(page.getByTestId("handle-g1")).toBeFocused();
  });

  test("rejects cycle attempts and keeps tree stable", async ({ page }) => {
    await page.getByTestId("attempt-cycle").click();
    await expect(page.getByTestId("last-reject-main")).toContainText("cycle");
    await expect(page.getByTestId("node-rA")).toHaveAttribute("data-parent", ROOT_SENTINEL);
    await expect(page.getByTestId("node-c1")).toHaveAttribute("data-parent", "rA");
  });

  test("pointer drop into nested child container selects that parent", async ({ page }) => {
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
    const handle = page.getByTestId("handle-c2");
    const targetHandle = page.getByTestId("handle-g1");
    const tbox = await targetHandle.boundingBox();
    expect(tbox).toBeTruthy();
    await startPointerDrag(page, handle);
    await movePointer(page, tbox!.x + tbox!.width / 2, tbox!.y + tbox!.height + 4, 25);
    await expect(page.getByRole("status")).toContainText("c1", { timeout: 10_000 });
    await page.mouse.up();
    await expect(page.getByRole("status")).toContainText("Child 2");
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "c1");
    await expect(page.getByTestId("last-intent-main")).toContainText("accepted");
    await expect(page.getByTestId("handle-c2")).toBeFocused();
  });

  test("exposes tree roles and aria-level for fixture nodes", async ({ page }) => {
    await expect(page.getByTestId("tree-root-main")).toBeVisible();
    await expect(page.getByTestId("node-rA")).toHaveAttribute("aria-level", "1");
    await expect(page.getByTestId("node-c1")).toHaveAttribute("aria-level", "2");
    await expect(page.getByTestId("node-g1")).toHaveAttribute("aria-level", "3");
    await expect(page.getByTestId("node-rA")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("node-rB")).not.toHaveAttribute("aria-expanded");
  });

  test("expands a collapsed parent after the pointer rests on it", async ({ page }) => {
    await page.getByTestId("toggle-c1").click();
    await expect(page.getByTestId("node-c1")).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("node-g1")).toHaveCount(0);

    const handle = page.getByTestId("handle-c2");
    const target = page.getByTestId("handle-c1");
    const rbox = await target.boundingBox();
    expect(rbox).toBeTruthy();
    await startPointerDrag(page, handle);
    await movePointer(page, rbox!.x + rbox!.width / 2, rbox!.y + rbox!.height / 2, 15);
    await expect(page.getByTestId("node-c1")).toHaveAttribute("aria-expanded", "true", {
      timeout: 3_000,
    });
    await expect(page.getByTestId("node-g1")).toBeVisible();
    await page.mouse.up();
  });

  test("cancels collapsed-parent expansion when the pointer leaves", async ({ page }) => {
    await page.getByTestId("toggle-c1").click();
    const handle = page.getByTestId("handle-c2");
    const row = page.getByTestId("handle-c1");
    const away = page.getByTestId("handle-rB");
    const rbox = await row.boundingBox();
    const abox = await away.boundingBox();
    expect(rbox && abox).toBeTruthy();
    await startPointerDrag(page, handle);
    await movePointer(page, rbox!.x + rbox!.width / 2, rbox!.y + rbox!.height / 2, 15);
    await movePointer(page, abox!.x + abox!.width / 2, abox!.y + abox!.height / 2, 15);
    await page.waitForTimeout(1_100);
    await expect(page.getByTestId("node-c1")).toHaveAttribute("aria-expanded", "false");
    await page.mouse.up();
  });

  test("collapsing the current target cancels the drag", async ({ page }) => {
    const handle = page.getByTestId("handle-c2");
    const target = page.getByTestId("handle-g1");
    const tbox = await target.boundingBox();
    expect(tbox).toBeTruthy();
    await startPointerDrag(page, handle);
    await movePointer(page, tbox!.x + tbox!.width / 2, tbox!.y + tbox!.height + 4, 20);
    await expect(page.getByTestId("engine-over-container-main")).toContainText("c1");
    await page.evaluate(() => {
      (window as Window & { __collapseNode?: (id: string) => void }).__collapseNode?.("c1");
    });
    await expect(page.getByRole("status")).toContainText("Cancelled");
    await page.mouse.up();
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
  });
});

test.describe("tree provider isolation", () => {
  test("duplicate ids in two trees do not share a keyboard reparent", async ({ page }) => {
    await page.goto(`${treeBase}/?fixture=isolation`);
    const treeA = page.getByTestId("tree-a");
    const treeB = page.getByTestId("tree-b");
    await expect(treeA.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
    await treeA.getByTestId("kb-indent-c2").click();
    await expect(treeA.getByTestId("node-c2")).toHaveAttribute("data-parent", "c1");
    await expect(treeB.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
  });
});
