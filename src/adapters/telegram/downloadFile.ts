// F-05 text TelegramMessenger text IIFE text
// text maxFileSizeBytes text
//   1. file_size textgetFile text file_size text cap text fetchtext
//   2. content-length textfetch text content-length text cap text server text file_sizetext
//   3. text cap text cancel text content-length text
// F-01 text fetch text url / token text botToken text error.message text logger text Telegram text

// text grammy text api.getFile text stub
export interface GetFileApi {
  getFile(
    fileId: string,
  ): Promise<{ file_id: string; file_path?: string; file_size?: number }>;
}

export interface DownloadOptions {
  api: GetFileApi;
  fileId: string;
  botToken: string;
  maxFileSizeBytes: number;
}

// text base64 text IIFE textbuf.toString("base64")text
export async function downloadTelegramFile(
  opts: DownloadOptions,
): Promise<string> {
  const { api, fileId, botToken, maxFileSizeBytes } = opts;

  // text 1 textgetFile text file_size
  const file = await api.getFile(fileId);
  if (file.file_size && file.file_size > maxFileSizeBytes) {
    throw new Error(
      `Arquivo muito grande: ${file.file_size} > ${maxFileSizeBytes} (file_id=${fileId})`,
    );
  }
  if (!file.file_path) {
    throw new Error(`file_path ausente (file_id=${fileId})`);
  }

  const url = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    // F-01textfetch text url/token text message text
    throw new Error(`Falha ao baixar arquivo do Telegram (file_id=${fileId})`);
  }

  // text 2 textcontent-length text
  const cl = parseInt(res.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(cl) && cl > maxFileSizeBytes) {
    // text cancel response bodytext socket text
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    throw new Error(
      `content-length ${cl} excede ${maxFileSizeBytes} (file_id=${fileId})`,
    );
  }

  if (!res.body) {
    throw new Error(`Corpo vazio (file_id=${fileId})`);
  }

  // text 3 text Buffertext server text
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxFileSizeBytes) {
        // text cancel text release text cancel
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        throw new Error(
          `Tamanho ${total} excede ${maxFileSizeBytes} (file_id=${fileId})`,
        );
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* text cancel / text done text reader text release text */
    }
  }

  return Buffer.concat(chunks).toString("base64");
}
