import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "bin/cursor-supervisor": "src/bin/cursor-supervisor.ts",
    "tools/attach-image": "src/tools/attach-image.ts",
    "tools/attach-file": "src/tools/attach-file.ts",
  },
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: false,
  shims: false,
  banner: { js: "#!/usr/bin/env node" },
});
