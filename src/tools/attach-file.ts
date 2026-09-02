import { runAttach } from "./attachShared.js";

runAttach("file", process.argv.slice(2)).catch((e) => {
  process.stderr.write(`cursor-supervisor-attach-file: ${(e as Error).message}\n`);
  process.exit(1);
});
