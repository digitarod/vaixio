interface GoogleLoginLinkProps {
  /** 登録画面から使う場合のみ渡す。新規アカウント作成の対象顧客を伝える。 */
  customerSlug?: string;
}

/**
 * 実際のOAuthフローはバックエンド(interfaces/dashboard-api/google-auth.ts)が担う。
 * ここではただの通常リンクとしてフルページ遷移させるだけ(InstagramConnectLinkと同じ方針)。
 */
export function GoogleLoginLink({ customerSlug }: GoogleLoginLinkProps) {
  const href = customerSlug
    ? `/dashboard-api/auth/google/start?customer_slug=${encodeURIComponent(customerSlug)}`
    : "/dashboard-api/auth/google/start";

  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white
        px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
    >
      <GoogleIcon />
      Googleでログイン
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.95 10.7a5.4 5.4 0 0 1 0-3.4V4.97H.95a9 9 0 0 0 0 8.06l3-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
