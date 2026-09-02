// バックエンド (interfaces/dashboard-api) が返す JSON の形。契約は固定されており
// フロントエンド側からは変更しない。 §契約: CLAUDE.md 記載の dashboard-api を参照。

export interface MeResponse {
  email: string;
  customerSlug: string | undefined;
}

export interface Connection {
  platform: string;
  accountName?: string;
  expiresAt: string | null;
}

export interface ConnectionsResponse {
  connections: Connection[];
}

export interface AuditEvent {
  id: number;
  toolName: string;
  argsDigest: string;
  result: string;
  dryRun: boolean;
  latencyMs: string;
  occurredAt: string;
}

export interface AuditResponse {
  events: AuditEvent[];
}

export interface ApiErrorBody {
  error: string;
}
