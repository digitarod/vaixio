import { InstagramIcon } from "./platform-icons";

interface InstagramConnectLinkProps {
  customerSlug: string | undefined;
  className?: string;
}

/**
 * 実際のOAuthフローはバックエンド(interfaces/oauth)が担う。ここではただの通常リンクとして
 * フルページ遷移させるだけで、fetchやSPAルーティングを一切介さない。
 */
export function InstagramConnectLink({ customerSlug, className = "" }: InstagramConnectLinkProps) {
  if (!customerSlug) {
    return (
      <span className="text-sm text-slate-400" title="お客様情報を取得できませんでした">
        Instagramを連携する
      </span>
    );
  }

  return (
    <a
      href={`/oauth/instagram/start?customer=${encodeURIComponent(customerSlug)}`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600
        px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_22px_rgba(192,38,133,.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(192,38,133,.22)] ${className}`}
    >
      <InstagramIcon className="h-4 w-4 shrink-0" />
      Instagramを連携する
    </a>
  );
}
