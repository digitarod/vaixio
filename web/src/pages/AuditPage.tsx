import { useEffect, useState } from "react";
import { fetchAuditEvents } from "../api/client";
import type { AuditEvent } from "../api/types";
import { AuditTable } from "../components/audit/AuditTable";
import { PageHeader } from "../components/layout/PageHeader";
import { Alert } from "../components/ui/Alert";
import { Spinner } from "../components/ui/Spinner";

export function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetchAuditEvents()
      .then((res) => {
        if (!cancelled) setEvents(res.events);
      })
      .catch(() => {
        if (!cancelled) setError("実行履歴の取得に失敗しました。時間をおいて再度お試しください");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="console-enter">
      <PageHeader
        eyebrow="OBSERVABILITY / 02"
        title="実行履歴"
        description="人とAIのすべての実行を追跡。結果、実行時間、dry runの状態を一つの画面で確認できます。"
      />
      {error ? (
        <Alert variant="error">{error}</Alert>
      ) : events === null ? (
        <Spinner label="実行履歴を読み込んでいます..." />
      ) : (
        <AuditTable events={events} />
      )}
    </section>
  );
}
