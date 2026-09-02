import { cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const extensionDir = join(root, "extension");
const serverDir = join(extensionDir, "server");

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npm", ["run", "build"]);
await rm(serverDir, { recursive: true, force: true });
await mkdir(join(serverDir, "bin"), { recursive: true });
await mkdir(join(serverDir, "tools"), { recursive: true });
await cp(join(root, "dist", "bin"), join(serverDir, "bin"), { recursive: true });
await cp(join(root, "dist", "tools"), join(serverDir, "tools"), { recursive: true });
run("npm", ["run", "build"], extensionDir);
run("npx", ["@vscode/vsce", "package", "--no-dependencies"], extensionDir);
