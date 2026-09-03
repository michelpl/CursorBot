import { readFile, writeFile } from "node:fs/promises";
import * as vscode from "vscode";
import { workspaceHasConfig } from "./serviceClient";
import { runSetupWizard } from "./setupWizard";

export type SecretField = "telegram.botToken" | "cursor.apiKey";

export type SecretFlags = {
  configExists: boolean;
  telegramBotToken: boolean;
  cursorApiKey: boolean;
};

function getNested(obj: Record<string, unknown>, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object" || Array.isArray(cur)) {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function setNested(
  obj: Record<string, unknown>,
  path: string,
  value: string,
): void {
  const parts = path.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    if (next == null || typeof next !== "object" || Array.isArray(next)) {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export async function getSecretFlags(configPath: string): Promise<SecretFlags> {
  if (!(await workspaceHasConfig(configPath))) {
    return {
      configExists: false,
      telegramBotToken: false,
      cursorApiKey: false,
    };
  }
  const parsed = await readConfigObject(configPath);
  if (!parsed) {
    return {
      configExists: true,
      telegramBotToken: false,
      cursorApiKey: false,
    };
  }
  return {
    configExists: true,
    telegramBotToken: isFilled(getNested(parsed, "telegram.botToken")),
    cursorApiKey: isFilled(getNested(parsed, "cursor.apiKey")),
  };
}

function isFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function readConfigObject(
  configPath: string,
): Promise<Record<string, unknown> | undefined> {
  let raw: string;
  try {
    raw = await readFile(configPath, "utf8");
  } catch {
    return undefined;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }
    return value as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export async function writeSecretField(
  configPath: string,
  field: SecretField,
  value: string,
): Promise<"updated" | "kept" | "invalid"> {
  const parsed = await readConfigObject(configPath);
  if (!parsed) return "invalid";
  const current = getNested(parsed, field);
  const hasCurrent = isFilled(current);
  const trimmed = value.trim();
  if (!trimmed) return hasCurrent ? "kept" : "invalid";
  setNested(parsed, field, trimmed);
  await writeFile(
    configPath,
    `${JSON.stringify(parsed, null, 2)}\n`,
    "utf8",
  );
  return "updated";
}

export async function promptAndSaveSecret(opts: {
  configPath: string;
  field: SecretField;
  title: string;
  prompt: string;
}): Promise<void> {
  if (!(await workspaceHasConfig(opts.configPath))) {
    const created = await runSetupWizard(opts.configPath);
    if (!created) return;
    void vscode.window.showInformationMessage(
      "Cursor Supervisor config created. Use the command again to replace a key.",
    );
    return;
  }

  const flags = await getSecretFlags(opts.configPath);
  const hasCurrent =
    opts.field === "telegram.botToken"
      ? flags.telegramBotToken
      : flags.cursorApiKey;

  const value = await vscode.window.showInputBox({
    title: opts.title,
    prompt: hasCurrent
      ? `${opts.prompt}. Leave empty to keep the current value.`
      : opts.prompt,
    password: true,
    ignoreFocusOut: true,
    validateInput: (v) => {
      if (v.trim()) return undefined;
      if (hasCurrent) return undefined;
      return "Value is required";
    },
  });
  if (value === undefined) return;
  const result = await writeSecretField(opts.configPath, opts.field, value);
  if (result === "kept") {
    void vscode.window.showInformationMessage("Kept the existing value.");
    return;
  }
  if (result === "invalid") {
    void vscode.window.showErrorMessage(
      `${opts.configPath} is not valid JSON.`,
    );
    return;
  }
  const updated =
    opts.field === "telegram.botToken"
      ? "Telegram bot token updated."
      : "Cursor API key updated.";
  void vscode.window.showInformationMessage(updated);
}
