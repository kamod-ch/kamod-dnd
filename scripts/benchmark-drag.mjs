#!/usr/bin/env node
/**
 * Drag-list performance probe (informative).
 *
 *   node scripts/benchmark-drag.mjs
 *
 * Starts perf-list preview on 14275, runs Chromium measurements, writes docs/performance/drag-lists.md
 */
import { chromium } from "@playwright/test";
import { execSync, spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const baseURL = "http://localhost:14275";
const sizes = [100, 500];

execSync("pnpm --filter @kamod-dnd/example-perf-list build", { cwd: root, stdio: "inherit" });

const preview = spawn("pnpm", ["--filter", "@kamod-dnd/example-perf-list", "preview"], {
  cwd: root,
  stdio: "ignore",
  detached: true,
});

await new Promise((resolveWait, reject) => {
  const deadline = Date.now() + 60_000;
  const tick = async () => {
    try {
      const res = await fetch(baseURL);
      if (res.ok) return resolveWait(undefined);
    } catch {
      /* retry */
    }
    if (Date.now() > deadline) reject(new Error("perf preview did not start"));
    setTimeout(tick, 300);
  };
  tick();
});

const browser = await chromium.launch();
const page = await browser.newPage();
const results = [];

for (const count of sizes) {
  await page.goto(`${baseURL}/?count=${count}`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="perf-list"]');

  await page.evaluate(() => {
    window.__DND_PERF__?.resetRowRenders();
    window.__DND_PERF__?.resetLongTasks();
  });

  const handle = page.getByTestId("handle-row-0");
  const box = await handle.boundingBox();
  if (!box) throw new Error("missing handle");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let step = 0; step < 30; step += 1) {
    const targetId = Math.min(count - 1, 5 + step * 2);
    const target = page.getByTestId(`handle-row-${targetId}`);
    const tbox = await target.boundingBox();
    if (tbox) {
      await page.mouse.move(tbox.x + tbox.width / 2, tbox.y + tbox.height / 2, { steps: 2 });
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(200);

  const metrics = await page.evaluate(() => ({
    rowRenders: window.__DND_PERF__?.getRowRenders() ?? 0,
    longTasks: window.__DND_PERF__?.getLongTasksMs() ?? [],
  }));

  results.push({
    count,
    rowRendersDuringDrag: metrics.rowRenders,
    longTaskCount: metrics.longTasks.length,
    longTaskMaxMs: metrics.longTasks.length ? Math.max(...metrics.longTasks) : 0,
  });
}

await browser.close();
process.kill(-preview.pid);

const outDir = resolve(root, "docs/performance");
await mkdir(outDir, { recursive: true });
const env = `Chromium (Playwright bundled), Linux, viewport default, measured ${new Date().toISOString()}.`;
const md = [
  "# Drag list performance (informative)",
  "",
  env,
  "",
  "Method: [`examples/perf-list`](../examples/perf-list) with `?count=N`, simulated pointer drag (~30 moves). Row render counter in each list row; `PerformanceObserver` (`longtask`) where supported.",
  "",
  "Not a FPS guarantee. Touch/real devices not covered.",
  "",
  "| Items | Row renders during drag | Long tasks | Max long task (ms) |",
  "| --- | --- | --- | --- |",
  ...results.map(
    (r) =>
      `| ${r.count} | ${r.rowRendersDuringDrag} | ${r.longTaskCount} | ${r.longTaskMaxMs.toFixed(1)} |`,
  ),
  "",
].join("\n");

await writeFile(resolve(outDir, "drag-lists.md"), md);
console.log(md);
