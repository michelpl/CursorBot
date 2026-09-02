import { runAttach } from "./attachShared.js";

runAttach("image", process.argv.slice(2)).catch((e) => {
  process.stderr.write(`cursor-supervisor-attach-image: ${(e as Error).message}\n`);
  process.exit(1);
});
