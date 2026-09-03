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
  shims: true,
  // VSIX copies dist into extension/server without node_modules.
  noExternal: [/.*/],
  banner: {
    js: `#!/usr/bin/env node
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
`,
  },
});
