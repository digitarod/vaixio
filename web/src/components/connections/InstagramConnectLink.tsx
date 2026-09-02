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
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600
        px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 ${className}`}
    >
      Instagramを連携する
    </a>
  );
}
