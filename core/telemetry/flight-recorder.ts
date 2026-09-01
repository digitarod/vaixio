import type { ErrorCode } from "../domain/schemas.js";

export interface FlightRecord {
  traceId: string;
  customer: string;
  tool: string;
  args: unknown;
  ts: string;
  latencyMs: number;
  result: "ok" | "error";
  errorCode?: ErrorCode;
  errorMessage?: string;
}

const SENSITIVE_KEYS = new Set(["token", "password", "secret", "authorization", "apikey", "api_key"]);

/** 秘匿情報を保存前にマスクする（§6.2 / §10）。 */
export function maskArgs(args: unknown): unknown {
  if (Array.isArray(args)) return args.map(maskArgs);
  if (args && typeof args === "object") {
    return Object.fromEntries(
      Object.entries(args as Record<string, unknown>).map(([key, value]) => [
        key,
        SENSITIVE_KEYS.has(key.toLowerCase()) ? "***" : maskArgs(value),
      ]),
    );
  }
  return args;
}

const RING_SIZE = 200;

/**
 * §6.2 フライトレコーダ: コネクタ(=tool名の名前空間)ごとに直近N件を保持。
 * 失敗した呼び出しは musubi.replay / fixture 化の元データになる。
 */
export class FlightRecorder {
  private readonly buffers = new Map<string, FlightRecord[]>();
  private readonly byTraceId = new Map<string, FlightRecord>();

  record(entry: FlightRecord): void {
    const namespace = entry.tool.split(".")[0] ?? "unknown";
    const masked: FlightRecord = { ...entry, args: maskArgs(entry.args) };
    const buf = this.buffers.get(namespace) ?? [];
    buf.push(masked);
    if (buf.length > RING_SIZE) buf.shift();
    this.buffers.set(namespace, buf);
    this.byTraceId.set(entry.traceId, masked);
  }

  recentErrors(limit = 20): FlightRecord[] {
    return [...this.byTraceId.values()]
      .filter((r) => r.result === "error")
      .slice(-limit)
      .reverse();
  }

  errorCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const r of this.byTraceId.values()) {
      if (r.result === "error" && r.errorCode) {
        counts[r.errorCode] = (counts[r.errorCode] ?? 0) + 1;
      }
    }
    return counts;
  }

  getByTraceId(traceId: string): FlightRecord | undefined {
    return this.byTraceId.get(traceId);
  }

  /** 失敗ケースを単体テストの fixture 形式にエクスポートする。 */
  toFixture(traceId: string): { tool: string; args: unknown; expected: string } | undefined {
    const rec = this.byTraceId.get(traceId);
    if (!rec) return undefined;
    return { tool: rec.tool, args: rec.args, expected: rec.result };
  }
}

export const flightRecorder = new FlightRecorder();
