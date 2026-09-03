import type { ToolError } from "../domain/schemas.js";

/**
 * §6.3: 外部APIの雑多なエラーを必ずこの5+1分類に正規化してから返す。
 * hint は「人とAIが次に何を調べるべきか」を書く。
 */
export function classifyError(err: unknown, context: { platform?: string } = {}): ToolError {
  const platform = context.platform ?? "connector";

  if (isTaggedToolError(err)) return err;

  const status = extractHttpStatus(err);
  const message = err instanceof Error ? err.message : String(err);

  if (status === 401 || status === 403) {
    return {
      code: "AUTH_EXPIRED",
      message,
      retriable: false,
      hint: `${platform} の資格情報が失効/不正の可能性。vault://.../${platform} を更新してください。`,
    };
  }
  if (status === 429) {
    return {
      code: "RATE_LIMITED",
      message,
      retriable: true,
      hint: `${platform} のレート制限に到達。vaixio.errors.recent で頻度を確認し、間隔を空けて再試行してください。`,
    };
  }
  if (status === 400 || status === 422) {
    return {
      code: "INVALID_INPUT",
      message,
      retriable: false,
      hint: "呼び出し引数を manifest の inputSchema と突き合わせて確認してください。",
    };
  }
  if (status !== undefined && status >= 500) {
    return {
      code: "UPSTREAM_DOWN",
      message,
      retriable: true,
      hint: `${platform} 側の障害の可能性。vaixio.connector.smoke で疎通を確認してください。`,
    };
  }

  return {
    code: "UNKNOWN",
    message,
    retriable: false,
    hint: "未分類のエラー。flight-recorder の記録から fixture 化し、taxonomy への追加を検討してください。",
  };
}

function isTaggedToolError(err: unknown): err is ToolError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    "retriable" in err &&
    "hint" in err
  );
}

function extractHttpStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const candidate = err as { status?: unknown; statusCode?: unknown; response?: { status?: unknown } };
  const raw = candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  return typeof raw === "number" ? raw : undefined;
}
