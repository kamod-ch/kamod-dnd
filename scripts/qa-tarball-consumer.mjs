import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
execSync("pnpm --filter @kamod-ch/dnd build", { cwd: root, stdio: "inherit" });
const pack = execSync("pnpm --filter @kamod-ch/dnd pack --pack-destination /tmp", {
  cwd: root,
  encoding: "utf8",
});
const tarball = pack.trim().split("\n").pop();
const dir = mkdtempSync(join(tmpdir(), "kamod-dnd-consumer-"));
writeFileSync(
  join(dir, "package.json"),
  JSON.stringify(
    {
      name: "kamod-dnd-consumer-smoke",
      private: true,
      type: "module",
      scripts: { build: "vite build" },
      dependencies: {
        "@kamod-ch/dnd": `file:${tarball}`,
        preact: "^10.29.7",
        "@preact/signals": "^2.9.4",
      },
      devDependencies: {
        vite: "^7.1.7",
        "@preact/preset-vite": "^2.10.2",
      },
    },
    null,
    2,
  ),
);
writeFileSync(
  join(dir, "vite.config.js"),
  `import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';
export default defineConfig({ plugins: [preact()] });`,
);
writeFileSync(
  join(dir, "index.html"),
  `<!doctype html><script type="module" src="/main.jsx"></script>`,
);
writeFileSync(
  join(dir, "main.jsx"),
  `import { DndProvider } from '@kamod-ch/dnd';
import { useSortable } from '@kamod-ch/dnd/sortable';
console.log(typeof DndProvider, typeof useSortable);`,
);
execSync("npm install --ignore-scripts", { cwd: dir, stdio: "inherit" });
execSync("npm run build", { cwd: dir, stdio: "inherit" });
console.log("tarball consumer smoke passed");
