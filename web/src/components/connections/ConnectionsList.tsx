import type { Connection } from "../../api/types";
import { EmptyState } from "../ui/EmptyState";
import { ConnectionCard } from "./ConnectionCard";
import { FacebookPageConnectLink } from "./FacebookPageConnectLink";
import { GoogleBusinessProfileConnectLink } from "./GoogleBusinessProfileConnectLink";
import { InstagramConnectLink } from "./InstagramConnectLink";

interface ConnectionsListProps {
  connections: Connection[];
  customerSlug: string | undefined;
}

function ConnectLinks({ customerSlug }: { customerSlug: string | undefined }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <InstagramConnectLink customerSlug={customerSlug} />
      <FacebookPageConnectLink customerSlug={customerSlug} />
      <GoogleBusinessProfileConnectLink customerSlug={customerSlug} />
    </div>
  );
}

export function ConnectionsList({ connections, customerSlug }: ConnectionsListProps) {
  if (connections.length === 0) {
    return (
      <EmptyState
        title="まだ連携済みのサービスがありません"
        description="Instagram・Facebookページ・Googleビジネスプロフィールと連携すると、投稿の自動化や実行履歴の確認がここでできるようになります。"
        action={<ConnectLinks customerSlug={customerSlug} />}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono text-[9px] tracking-[0.16em] text-[#9187ac]">ACTIVE CONNECTIONS</p>
          <h2 className="mt-1.5 text-sm font-semibold text-[#514b58]">連携中のサービス</h2>
        </div>
        <ConnectLinks customerSlug={customerSlug} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {connections.map((connection) => (
          <ConnectionCard key={connection.platform} connection={connection} />
        ))}
      </div>
    </div>
  );
}
