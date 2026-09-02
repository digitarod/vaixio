import { useEffect, useState } from "react";
import { fetchAuditEvents } from "../api/client";
import type { AuditEvent } from "../api/types";
import { AuditTable } from "../components/audit/AuditTable";
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

  if (error) return <Alert variant="error">{error}</Alert>;
  if (events === null) return <Spinner label="実行履歴を読み込んでいます..." />;

  return <AuditTable events={events} />;
}
