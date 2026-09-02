import type { Connection } from "../../api/types";
import { EmptyState } from "../ui/EmptyState";
import { ConnectionCard } from "./ConnectionCard";
import { InstagramConnectLink } from "./InstagramConnectLink";

interface ConnectionsListProps {
  connections: Connection[];
  customerSlug: string | undefined;
}

export function ConnectionsList({ connections, customerSlug }: ConnectionsListProps) {
  if (connections.length === 0) {
    return (
      <EmptyState
        title="まだ連携済みのサービスがありません"
        description="Instagramと連携すると、投稿の自動化や実行履歴の確認がここでできるようになります。"
        action={<InstagramConnectLink customerSlug={customerSlug} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">連携中のサービス</h2>
        <InstagramConnectLink customerSlug={customerSlug} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <ConnectionCard key={connection.platform} connection={connection} />
        ))}
      </div>
    </div>
  );
}
