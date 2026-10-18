import { expect, test } from "@playwright/test";

test.describe("tree spike", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('[data-testid="tree-title"]', { timeout: 30_000 });
  });

  test("indent sibling under previous sibling and outdent back", async ({ page }) => {
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
    await page.getByTestId("kb-indent-c2").click();
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "c1");
    await expect(page.getByTestId("last-reject")).toHaveText("Last reject: none");

    await page.getByTestId("kb-outdent-c2").click();
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
  });

  test("moves a node into an initially empty child list", async ({ page }) => {
    await expect(page.getByTestId("empty-rB")).toBeVisible();
    await page.getByTestId("move-g1-to-rB").click();
    await expect(page.getByTestId("node-g1")).toHaveAttribute("data-parent", "rB");
    await expect(page.getByTestId("empty-rB")).toHaveCount(0);
  });

  test("rejects cycle attempts and keeps tree stable", async ({ page }) => {
    await page.getByTestId("attempt-cycle").click();
    await expect(page.getByTestId("last-reject")).toContainText("cycle");
    await expect(page.getByTestId("node-rA")).toHaveAttribute("data-parent", ROOT_SENTINEL);
    await expect(page.getByTestId("node-c1")).toHaveAttribute("data-parent", "rA");
  });

  test("pointer drop into nested child container selects that parent", async ({ page }) => {
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "rA");
    const handle = page.getByTestId("handle-c2");
    const targetHandle = page.getByTestId("handle-g1");
    const hbox = await handle.boundingBox();
    const tbox = await targetHandle.boundingBox();
    expect(hbox).toBeTruthy();
    expect(tbox).toBeTruthy();
    await page.mouse.move(hbox!.x + hbox!.width / 2, hbox!.y + hbox!.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(tbox!.x + tbox!.width / 2, tbox!.y + tbox!.height + 4, {
      steps: 25,
    });
    await page.waitForTimeout(50);
    await page.mouse.up();
    await expect(page.getByTestId("node-c2")).toHaveAttribute("data-parent", "c1");
    await expect(page.getByTestId("last-intent")).toContainText("accepted");
  });

  test("exposes tree roles and aria-level for fixture nodes", async ({ page }) => {
    await expect(page.getByRole("tree")).toBeVisible();
    await expect(page.getByTestId("node-rA")).toHaveAttribute("aria-level", "1");
    await expect(page.getByTestId("node-c1")).toHaveAttribute("aria-level", "2");
    await expect(page.getByTestId("node-g1")).toHaveAttribute("aria-level", "3");
    await expect(page.getByTestId("node-rA")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("node-rB")).not.toHaveAttribute("aria-expanded");
  });
});

const ROOT_SENTINEL = "__tree_root__";
