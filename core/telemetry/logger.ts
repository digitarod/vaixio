import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LogEntry } from "../domain/schemas.js";

const logFile = join(process.cwd(), "logs", "musubi.jsonl");

let dirReady: Promise<void> | undefined;
function ensureDir(): Promise<void> {
  if (!dirReady) {
    dirReady = mkdir(dirname(logFile), { recursive: true }).then(() => undefined);
  }
  return dirReady;
}

/**
 * §6.1 / §8.6: ハブ全体で唯一許可されたログ出力経路。
 * console.log は lint で禁止し、必ずここを経由させる（構造化 JSONL 1本に統一）。
 */
export async function log(entry: Omit<LogEntry, "ts">): Promise<void> {
  const line: LogEntry = { ts: new Date().toISOString(), ...entry };
  await ensureDir();
  await appendFile(logFile, `${JSON.stringify(line)}\n`, "utf8");
}

export function getLogFilePath(): string {
  return logFile;
}

/** musubi.trace.get が使う: trace_id 一致行だけを読み出す。 */
export async function readEntriesByTraceId(traceId: string): Promise<LogEntry[]> {
  const { readFile } = await import("node:fs/promises");
  let raw: string;
  try {
    raw = await readFile(logFile, "utf8");
  } catch {
    return [];
  }
  const entries: LogEntry[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as LogEntry;
      if (parsed.trace_id === traceId) entries.push(parsed);
    } catch {
      // 壊れた行は無視（調査可能性を落とさないため丸ごと失敗させない）
    }
  }
  return entries;
}
