import { useEffect, useState } from "react";
import { fetchConnections } from "../api/client";
import type { Connection } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ConnectionsList } from "../components/connections/ConnectionsList";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Spinner } from "../components/ui/Spinner";

export function ConnectionsPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchConnections()
      .then((res) => {
        if (!cancelled) setConnections(res.connections);
      })
      .catch(() => {
        if (!cancelled) setError("連携状況の取得に失敗しました。時間をおいて再度お試しください");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="console-enter">
      <PageHeader
        eyebrow="CONNECTOR WORKSPACE / 01"
        title="連携サービス"
        description="事業で使うサービスを接続し、AIエージェントが安全に行動できる環境を整えます。"
      />
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : connections === null ? (
        <Spinner label="連携状況を読み込んでいます..." />
      ) : (
        <ConnectionsList connections={connections} customerSlug={user?.customerSlug} />
      )}
    </section>
  );
}
