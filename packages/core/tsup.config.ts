import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    tree: "src/tree/index.ts",
  },
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "esnext",
  external: ["preact", "preact/hooks", "preact/jsx-runtime", "@preact/signals"],
});
