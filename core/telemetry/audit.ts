import { createHash } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { AuditEntry } from "../domain/schemas.js";
import { maskArgs } from "./flight-recorder.js";

const auditDir = join(process.cwd(), "logs", "audit");

const dirsReady = new Set<string>();
async function ensureDir(): Promise<void> {
  if (dirsReady.has(auditDir)) return;
  await mkdir(auditDir, { recursive: true });
  dirsReady.add(auditDir);
}

export function digestArgs(args: unknown): string {
  return createHash("sha256").update(JSON.stringify(maskArgs(args))).digest("hex").slice(0, 16);
}

/** §5: 「AIに何をさせたか」を顧客に提示できる形で、顧客別に監査ログを保存する。 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await ensureDir();
  const path = join(auditDir, `${entry.customer}.jsonl`);
  await appendFile(path, `${JSON.stringify(entry)}\n`, "utf8");
}
