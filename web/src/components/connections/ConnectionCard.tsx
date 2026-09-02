import type { Connection } from "../../api/types";
import { formatExpiry, isExpired, isExpiringSoon } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
};

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function ConnectionCard({ connection }: { connection: Connection }) {
  const expired = isExpired(connection.expiresAt);
  const warning = isExpiringSoon(connection.expiresAt);

  return (
    <Card className={warning ? "border-amber-300" : undefined}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {platformLabel(connection.platform)}
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{connection.accountName ?? "未設定のアカウント"}</p>
        </div>
        <Badge tone="green">連携済み</Badge>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {warning && (
          <Badge tone={expired ? "red" : "amber"}>{expired ? "期限切れ" : "まもなく期限切れ"}</Badge>
        )}
        <p className={`text-sm ${warning ? "font-medium text-amber-700" : "text-slate-500"}`}>
          {formatExpiry(connection.expiresAt)}
        </p>
      </div>
    </Card>
  );
}
