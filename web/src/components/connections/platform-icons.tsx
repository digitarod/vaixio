interface IconProps {
  className?: string;
}

/** 各プラットフォームのブランドアイコン。ConnectionCard・各種ConnectLinkで共用する。 */

export function InstagramIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig-gradient)" />
      <circle cx="12" cy="12" r="4.2" stroke="white" strokeWidth="1.6" />
      <circle cx="17.15" cy="6.85" r="1.1" fill="white" />
      <defs>
        <linearGradient id="ig-gradient" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F59E0B" />
          <stop offset="0.5" stopColor="#DB2777" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function FacebookIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#1877F2" />
      <path
        d="M13.6 20v-6.6h2.2l.34-2.6h-2.54V9.1c0-.75.2-1.27 1.28-1.27h1.38V5.5c-.24-.03-1.06-.1-2.02-.1-2 0-3.36 1.2-3.36 3.46v1.94H8.3v2.6h2.58V20h2.72Z"
        fill="white"
      />
    </svg>
  );
}

export function GoogleIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} aria-hidden="true">
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

export function LineIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" fill="#06C755" />
      <path
        d="M12 6.4c-3.6 0-6.5 2.35-6.5 5.24 0 2.6 2.3 4.77 5.4 5.18.21.05.5.14.57.33.06.16.04.42.02.59l-.09.55c-.03.16-.13.63.55.34.68-.28 3.68-2.17 5.02-3.71 1.24-1.02 1.53-2.6 1.53-3.28C18.5 8.75 15.6 6.4 12 6.4Zm-3.6 6.72h-1.3a.22.22 0 0 1-.22-.22V9.98a.22.22 0 0 1 .22-.22h.4a.22.22 0 0 1 .22.22v2.55h.68a.22.22 0 0 1 .22.22v.35a.22.22 0 0 1-.22.22Zm1.98-.22a.22.22 0 0 1-.22.22h-.4a.22.22 0 0 1-.22-.22V9.98a.22.22 0 0 1 .22-.22h.4a.22.22 0 0 1 .22.22v2.92Zm3.2 0a.22.22 0 0 1-.22.22h-.4a.22.22 0 0 1-.18-.09l-1.15-1.55v1.42a.22.22 0 0 1-.22.22h-.4a.22.22 0 0 1-.22-.22V9.98a.22.22 0 0 1 .22-.22h.4c.07 0 .14.03.18.09l1.15 1.55V9.98a.22.22 0 0 1 .22-.22h.4a.22.22 0 0 1 .22.22v2.92Zm2.68-2.14h-.68v.4h.68a.22.22 0 0 1 0 .44h-.68v.4h.68a.22.22 0 0 1 0 .44h-1.3a.22.22 0 0 1-.22-.22V9.98a.22.22 0 0 1 .22-.22h1.3a.22.22 0 0 1 0 .44Z"
        fill="white"
      />
    </svg>
  );
}
