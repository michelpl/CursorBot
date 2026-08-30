import { runAttach } from "./attachShared.js";

// cursorbot-attach-filetext attach-image text runAttachtext kind=file
// textTelegram text sendDocument text sendPhoto text
runAttach("file", process.argv.slice(2)).catch((e) => {
  process.stderr.write(`cursorbot-attach-file: ${(e as Error).message}\n`);
  process.exit(1);
});
