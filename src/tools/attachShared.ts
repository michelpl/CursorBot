// CLI text argv text text pending text append text queue.jsonltext
// text logger / config / zodtextagent text
import {
  mkdir,
  copyFile,
  stat,
  readFile,
  appendFile,
  chmod,
} from "node:fs/promises";
import { resolve, dirname, basename, join } from "node:path";

export type AttachKind = "image" | "file";

interface ParsedArgs {
  filePath: string;
  caption?: string;
  dataDirOverride?: string;
}

// text argv text flag textflag text --caption / --data-dir
function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 0) {
    throw new Error("usage: <file> [--caption <text>] [--data-dir <path>]");
  }
  let filePath: string | undefined;
  let caption: string | undefined;
  let dataDirOverride: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--caption") {
      caption = argv[++i];
    } else if (a === "--data-dir") {
      dataDirOverride = argv[++i];
    } else if (!filePath) {
      filePath = a;
    } else {
      throw new Error(`unexpected arg: ${a}`);
    }
  }
  if (!filePath) throw new Error("file path required");
  return { filePath: resolve(filePath), caption, dataDirOverride };
}

// text
// 1. --data-dir flag
// 2. CURSOR_SUPERVISOR_DATA_DIR env
// 3. walk cwd for .cursor-supervisor/data-dir.txt
async function locateDataDir(override?: string): Promise<string> {
  if (override) return resolve(override);
  if (process.env.CURSOR_SUPERVISOR_DATA_DIR) {
    return resolve(process.env.CURSOR_SUPERVISOR_DATA_DIR);
  }
  let cur = process.cwd();
  for (let i = 0; i < 32; i++) {
    const marker = join(cur, ".cursor-supervisor", "data-dir.txt");
    try {
      const txt = (await readFile(marker, "utf8")).trim();
      if (txt) return resolve(txt);
    } catch {
      // keep walking
    }
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  throw new Error(
    "could not locate Cursor Supervisor data dir; set CURSOR_SUPERVISOR_DATA_DIR or run the service once in this workspace",
  );
}

export async function runAttach(
  kind: AttachKind,
  argv: string[],
): Promise<void> {
  const { filePath, caption, dataDirOverride } = parseArgs(argv);
  const dataDir = await locateDataDir(dataDirOverride);
  // stat text ENOENTtext catch text exit 1
  const st = await stat(filePath);
  if (!st.isFile()) throw new Error(`not a file: ${filePath}`);

  const pendingDir = join(dataDir, "attachments", "pending");
  // F-13textpending text 0700textpending text chmod 0600
  // text copyFile text source modetext 0600text chmodtext
  await mkdir(pendingDir, { recursive: true, mode: 0o700 });
  // text ISO text+ text basename text
  const isoTs = new Date().toISOString().replace(/[:.]/g, "-");
  const destPath = join(pendingDir, `${isoTs}-${basename(filePath)}`);
  await copyFile(filePath, destPath);
  // F-13textcopyFile text 0o600textWindows text chmod text best-efforttext
  // text skip Windowstext
  await chmod(destPath, 0o600);

  const entry = {
    cwd: process.cwd(),
    kind,
    path: destPath,
    caption,
    queuedAt: Date.now(),
  };
  const queuePath = join(dataDir, "attachments", "queue.jsonl");
  // F-13textqueue.jsonl text 0o600
  await appendFile(queuePath, JSON.stringify(entry) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });

  // text agent text grep text
  process.stdout.write(`queued: ${destPath}\n`);
}
