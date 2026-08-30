import { runAttach } from "./attachShared.js";

// cursorbot-attach-imagetext cursorbot text pending/text
// text append text attachments/queue.jsonltext run.wait() text dispatcher text
runAttach("image", process.argv.slice(2)).catch((e) => {
  process.stderr.write(`cursorbot-attach-image: ${(e as Error).message}\n`);
  process.exit(1);
});
