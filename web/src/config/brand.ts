/**
 * プロダクト名は未確定（founder曰く "musubi.com" は取得できなかった）。
 * ここを唯一の情報源とし、ヘッダー/タイトル/ページタイトルはすべてここから import する。
 * リブランド時はこのファイルだけを書き換えればよい。
 */
export interface Brand {
  name: string;
  tagline: string;
}

export const brand: Brand = {
  name: "Corda",
  tagline: "連携と稼働状況を、ひとつのダッシュボードで。",
};
