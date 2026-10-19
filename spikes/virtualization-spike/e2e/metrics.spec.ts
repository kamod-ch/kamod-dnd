import { expect, test } from "@playwright/test";

for (const count of [1_000, 10_000]) {
  test(`records drag metrics for ${count} rows`, async ({ page }) => {
    await page.goto(`/?count=${count}`);
    await page.waitForSelector("[data-testid='mounted-main']");
    await page.evaluate(() => {
      window.__VIRT__?.resetRowRenders();
      window.__VIRT__?.resetLongTasks();
    });
    const mountedBefore = Number(await page.getByTestId("mounted-main").innerText());
    const handle = page.getByTestId("handle-row-0");
    const target = page.getByTestId("handle-row-3");
    const box = await handle.boundingBox();
    const targetBox = await target.boundingBox();
    expect(box && targetBox).toBeTruthy();
    const started = Date.now();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      targetBox!.x + targetBox!.width / 2,
      targetBox!.y + targetBox!.height / 2,
      {
        steps: 15,
      },
    );
    await expect(page.getByRole("status")).toContainText(/position [2-9]/);
    await page.mouse.up();
    const elapsedMs = Date.now() - started;
    await expect(page.getByTestId("index-row-0")).not.toHaveText("Index row-0: 0");
    const sample = await page.evaluate(() => ({
      mounted: Number(document.querySelector("[data-testid='mounted-main']")?.textContent ?? "0"),
      rowRenders: window.__VIRT__?.getRowRenders() ?? -1,
      longTasksMs: window.__VIRT__?.getLongTasksMs() ?? [],
      userAgent: navigator.userAgent,
    }));
    console.log(
      JSON.stringify({
        count,
        mountedBefore,
        mountedAfter: sample.mounted,
        rowRenders: sample.rowRenders,
        longTasksMs: sample.longTasksMs,
        elapsedMs,
        userAgent: sample.userAgent,
      }),
    );
    expect(sample.mounted).toBeGreaterThan(5);
    expect(sample.mounted).toBeLessThan(80);
    expect(sample.rowRenders).toBeGreaterThan(0);
  });
}
