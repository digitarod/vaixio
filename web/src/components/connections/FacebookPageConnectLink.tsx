import { FacebookIcon } from "./platform-icons";

interface FacebookPageConnectLinkProps {
  customerSlug: string | undefined;
  className?: string;
}

/**
 * 実際のOAuthフローはバックエンド(interfaces/oauth)が担う。ここではただの通常リンクとして
 * フルページ遷移させるだけで、fetchやSPAルーティングを一切介さない(InstagramConnectLinkと同じ方針)。
 */
export function FacebookPageConnectLink({ customerSlug, className = "" }: FacebookPageConnectLinkProps) {
  if (!customerSlug) {
    return (
      <span className="text-sm text-slate-400" title="お客様情報を取得できませんでした">
        Facebookページを連携する
      </span>
    );
  }

  return (
    <a
      href={`/oauth/facebook-page/start?customer=${encodeURIComponent(customerSlug)}`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#1269d8] bg-[#1877F2] px-4 py-2.5 text-xs font-semibold
        text-white shadow-[0_8px_22px_rgba(24,119,242,.14)] transition-all hover:-translate-y-0.5 hover:bg-[#126fdf] ${className}`}
    >
      <FacebookIcon className="h-4 w-4 shrink-0" />
      Facebookページを連携する
    </a>
  );
}
