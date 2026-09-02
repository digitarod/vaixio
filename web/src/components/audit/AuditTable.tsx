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
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              ツール名
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              結果
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              種別
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              実行時間
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              実行日時
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-slate-50/60">
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">{event.toolName}</td>
              <td className="px-4 py-3">
                <ResultBadge result={event.result} />
              </td>
              <td className="px-4 py-3">
                {event.dryRun ? <Badge tone="amber">dry run</Badge> : <span className="text-slate-400">—</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatLatency(event.latencyMs)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTimeJa(event.occurredAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
