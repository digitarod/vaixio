import { GoogleIcon } from "./platform-icons";

interface GoogleBusinessProfileConnectLinkProps {
  customerSlug: string | undefined;
  className?: string;
}

/**
 * 実際のOAuthフローはバックエンド(interfaces/oauth)が担う。ここではただの通常リンクとして
 * フルページ遷移させるだけで、fetchやSPAルーティングを一切介さない(InstagramConnectLinkと同じ方針)。
 */
export function GoogleBusinessProfileConnectLink({ customerSlug, className = "" }: GoogleBusinessProfileConnectLinkProps) {
  if (!customerSlug) {
    return (
      <span className="text-sm text-slate-400" title="お客様情報を取得できませんでした">
        Googleビジネスプロフィールを連携する
      </span>
    );
  }

  return (
    <a
      href={`/oauth/google-business-profile/start?customer=${encodeURIComponent(customerSlug)}`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#ddd9e2] bg-white
        px-4 py-2.5 text-xs font-semibold text-[#5d5764] shadow-[0_7px_18px_rgba(30,23,48,.05)] transition-all hover:-translate-y-0.5 hover:border-[#c8c2d1] hover:bg-[#faf9fb] ${className}`}
    >
      <GoogleIcon className="h-4 w-4 shrink-0" />
      Googleビジネスプロフィールを連携する
    </a>
  );
}
