/**
 * バックエンドが返す error コードを、ユーザー向けの日本語文言に変換する。
 * 400系のバリデーションエラーはバックエンド側で既に日本語文になっているため
 * (例: "パスワードは10文字以上にしてください")、辞書に無いものはそのまま表示する。
 */
const KNOWN_ERRORS: Record<string, string> = {
  CUSTOMER_NOT_FOUND: "そのお客様IDはまだ登録されていません。担当者にご確認ください",
  EMAIL_TAKEN: "このメールアドレスは既に登録されています",
  INVALID_CREDENTIALS: "メールアドレスまたはパスワードが正しくありません",
  unauthorized: "セッションの有効期限が切れました。もう一度ログインしてください",
  UNKNOWN_ERROR: "エラーが発生しました。時間をおいて再度お試しください",
};

export function translateApiError(code: string): string {
  return KNOWN_ERRORS[code] ?? code;
}
