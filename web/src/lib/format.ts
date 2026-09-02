const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" });
const DATETIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const EXPIRY_WARNING_WINDOW_DAYS = 7;

/** "2026年10月31日" の形式に整形する。 */
export function formatDateJa(iso: string): string {
  return DATE_FORMATTER.format(new Date(iso));
}

/** "2026/09/02 21:47" の形式に整形する。 */
export function formatDateTimeJa(iso: string): string {
  return DATETIME_FORMATTER.format(new Date(iso));
}

/** connections の expiresAt を人間向けの文言に整形する。 */
export function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "有効期限の設定なし";
  if (isExpired(expiresAt)) return `${formatDateJa(expiresAt)}に期限切れ`;
  return `${formatDateJa(expiresAt)}まで有効`;
}

export function isExpired(expiresAt: string | null, now: Date = new Date()): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < now.getTime();
}

/** 期限切れ、または期限が近い(既定7日以内)場合に true。カードの警告表示に使う。 */
export function isExpiringSoon(
  expiresAt: string | null,
  windowDays: number = EXPIRY_WARNING_WINDOW_DAYS,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const diffMs = new Date(expiresAt).getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= windowDays;
}
