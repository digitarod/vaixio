/**
 * プロダクト名は VAIXIO（開発コード名: Musubi）に確定済み（2026-09-03）。
 * ここを唯一の情報源とし、ヘッダー/タイトル/ページタイトルはすべてここから import する。
 * リブランド時はこのファイルだけを書き換えればよい。
 */
export interface Brand {
  name: string;
  tagline: string;
}

export const brand: Brand = {
  name: "VAIXIO",
  tagline: "連携と稼働状況を、ひとつのダッシュボードで。",
};
