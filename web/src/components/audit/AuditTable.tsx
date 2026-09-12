import type { AuditEvent } from "../../api/types";
import { formatDateTimeJa } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

function ResultBadge({ result }: { result: string }) {
  if (result === "ok") return <Badge tone="green">成功</Badge>;
  if (result === "error") return <Badge tone="red">エラー</Badge>;
  return <Badge tone="slate">{result}</Badge>;
}

function formatLatency(latencyMs: string): string {
  const value = Number(latencyMs);
  return Number.isFinite(value) ? `${value.toLocaleString("ja-JP")} ms` : latencyMs;
}

export function AuditTable({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="まだ実行履歴がありません"
        description="ツールが実行されると、ここに履歴が表示されます。"
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e6e3ea] bg-white shadow-[0_16px_45px_rgba(30,23,48,.05)]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-[#e8e5ec] bg-[#faf9fb] font-mono text-[9px] uppercase tracking-[0.13em] text-[#8f8995]">
          <tr>
            <th scope="col" className="px-5 py-4 font-medium">
              ツール名
            </th>
            <th scope="col" className="px-5 py-4 font-medium">
              結果
            </th>
            <th scope="col" className="px-5 py-4 font-medium">
              種別
            </th>
            <th scope="col" className="px-5 py-4 font-medium">
              実行時間
            </th>
            <th scope="col" className="px-5 py-4 font-medium">
              実行日時
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efecf2]">
          {events.map((event) => (
            <tr key={event.id} className="transition-colors hover:bg-brand-50/35">
              <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-medium text-[#3c3546]">{event.toolName}</td>
              <td className="px-5 py-4">
                <ResultBadge result={event.result} />
              </td>
              <td className="px-5 py-4">
                {event.dryRun ? <Badge tone="amber">dry run</Badge> : <span className="text-slate-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-xs text-[#77717e]">{formatLatency(event.latencyMs)}</td>
              <td className="whitespace-nowrap px-5 py-4 text-xs text-[#77717e]">{formatDateTimeJa(event.occurredAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
