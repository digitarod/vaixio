/**
 * 空文字列や空白のみの値を「未設定」として扱う。`.env`に空/コメントアウト漏れの値が
 * 残っていると、空配列の allowedHosts が渡り全リクエストが403になる事故がローカル検証で
 * 複数回発生したため、堅牢に倒す。
 */
export function parseAllowedHosts(raw: string | undefined): string[] | undefined {
  const hosts = raw
    ?.split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return hosts && hosts.length > 0 ? hosts : undefined;
}
