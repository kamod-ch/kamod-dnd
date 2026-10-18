#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
execSync("pnpm --filter @kamod-ch/dnd build", { cwd: root, stdio: "inherit" });

const indexPath = resolve(root, "packages/core/dist/index.js");
const raw = statSync(indexPath).size;
const gz = gzipSync(readFileSync(indexPath)).length;

const packLine = execSync("pnpm --filter @kamod-ch/dnd pack --pack-destination /tmp", {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .pop();
const tarballKb = packLine ? Math.round(statSync(packLine).size / 1024) : 0;

const md = [
  "# Bundle size (informative)",
  "",
  `Measured ${new Date().toISOString()}.`,
  "",
  "| Artifact | Bytes |",
  "| --- | --- |",
  `| dist/index.js (raw) | ${raw} |`,
  `| dist/index.js (gzip) | ${gz} |`,
  `| npm pack tarball | ${tarballKb} KiB |`,
  "",
  "Minimal consumer bundle: run `node scripts/qa-tarball-consumer.mjs` (Vite production build of tarball import).",
  "",
].join("\n");

const outDir = resolve(root, "docs/performance");
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, "bundle-size.md"), md);
console.log(md);
