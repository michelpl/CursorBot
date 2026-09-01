import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { downloadTelegramFile } from "../../src/adapters/telegram/downloadFile.js";

// text F-05 text maxFileSizeBytes
//
// text casetext
// 1. file_size pre-checktextgetFile text file_size text cap text text fetchtext
// 2. content-length textfetch text header content-length text cap text text server text file_sizetext
// 3. text content-length text cap text text cap text cancel

describe("downloadTelegramFile text F-05 size cap", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // text ReadableStream + text content-length text fetch mock
  function makeFetchMock(opts: {
    chunks: Uint8Array[];
    contentLength?: number;
  }): typeof fetch {
    return vi.fn(async () => {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          for (const c of opts.chunks) controller.enqueue(c);
          controller.close();
        },
      });
      const headers = new Headers();
      if (opts.contentLength !== undefined) {
        headers.set("content-length", String(opts.contentLength));
      }
      return new Response(stream, { headers });
    }) as unknown as typeof fetch;
  }

  // text grammy api.getFile text
  function makeApi(
    file: { file_path?: string; file_size?: number },
  ): { getFile: (id: string) => Promise<typeof file & { file_id: string }> } {
    return {
      getFile: vi.fn(async (id: string) => ({ file_id: id, ...file })),
    };
  }

  it("Case 1textgetFile text file_size text cap text text fetch", async () => {
    const api = makeApi({ file_path: "doc/abc.jpg", file_size: 5_000_001 });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      downloadTelegramFile({
        api,
        fileId: "f1",
        botToken: "12345:fake",
        maxFileSizeBytes: 5_000_000,
      }),
    ).rejects.toThrow(/Arquivo muito grande|muito grande/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Case 2text content-length text cap text text file_size text", async () => {
    const api = makeApi({ file_path: "doc/abc.jpg" }); // text file_size
    vi.stubGlobal(
      "fetch",
      makeFetchMock({
        chunks: [new Uint8Array(1024)],
        contentLength: 5_000_001,
      }),
    );

    await expect(
      downloadTelegramFile({
        api,
        fileId: "f1",
        botToken: "12345:fake",
        maxFileSizeBytes: 5_000_000,
      }),
    ).rejects.toThrow(/content-length/);
  });

  it("Case 3text content-lengthtext cap text text cap text", async () => {
    const api = makeApi({ file_path: "doc/abc.jpg" });
    // 4 text chunk text 2 MBtext 8 MBtextcap 5 MB text text 3 text chunktext 6 MBtext
    const chunk = new Uint8Array(2 * 1024 * 1024);
    vi.stubGlobal(
      "fetch",
      makeFetchMock({
        chunks: [chunk, chunk, chunk, chunk],
        // text contentLength
      }),
    );

    await expect(
      downloadTelegramFile({
        api,
        fileId: "f1",
        botToken: "12345:fake",
        maxFileSizeBytes: 5 * 1024 * 1024,
      }),
    ).rejects.toThrow(/excede|Tamanho/i);
  });

  it("Case 4text base64", async () => {
    const api = makeApi({ file_path: "doc/abc.jpg", file_size: 11 });
    // text "hello world" 11 text
    const data = new TextEncoder().encode("hello world");
    vi.stubGlobal(
      "fetch",
      makeFetchMock({ chunks: [data], contentLength: 11 }),
    );

    const result = await downloadTelegramFile({
      api,
      fileId: "f1",
      botToken: "12345:fake",
      maxFileSizeBytes: 1024,
    });

    expect(typeof result).toBe("string");
    // base64("hello world") = "aGVsbG8gd29ybGQ="
    expect(result).toBe("aGVsbG8gd29ybGQ=");
  });

  it("Case 5textfetch text botToken text URLtextF-01 text", async () => {
    const api = makeApi({ file_path: "doc/abc.jpg", file_size: 100 });
    const failingFetch = vi.fn(async () => {
      throw new Error(
        "request to https://api.telegram.org/file/bot12345:SECRET/doc/abc.jpg failed",
      );
    });
    vi.stubGlobal("fetch", failingFetch);

    let caught: Error | undefined;
    try {
      await downloadTelegramFile({
        api,
        fileId: "f1",
        botToken: "12345:SECRET",
        maxFileSizeBytes: 1024,
      });
    } catch (e) {
      caught = e as Error;
    }

    expect(caught).toBeDefined();
    expect(caught!.message).not.toContain("12345:SECRET");
    expect(caught!.message).not.toMatch(/bot[\w:]+/);
  });
});
