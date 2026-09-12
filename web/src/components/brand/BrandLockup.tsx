import { brand } from "../../config/brand";

interface BrandLockupProps {
  tone?: "light" | "dark";
  showTagline?: boolean;
  compact?: boolean;
}

export function BrandLockup({ tone = "dark", showTagline = false, compact = false }: BrandLockupProps) {
  const foreground = tone === "light" ? "text-white" : "text-[#18151f]";
  const secondary = tone === "light" ? "text-white/42" : "text-[#7d7787]";

  return (
    <div className="flex items-center gap-3">
      <svg aria-hidden="true" className={compact ? "h-9 w-9" : "h-10 w-10"} viewBox="0 0 52 52" fill="none">
        <rect x=".75" y=".75" width="50.5" height="50.5" rx="15" fill={tone === "light" ? "#111017" : "#0B0B10"} />
        <rect x=".75" y=".75" width="50.5" height="50.5" rx="15" stroke="url(#dashboard-frame)" strokeWidth="1.5" />
        <path d="M10.5 11.5 26 28l15.5-16.5M10.5 40.5 26 25l15.5 15.5" stroke="url(#dashboard-signal)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="26" cy="26" r="3.25" fill="#F3F1FF" />
        <circle cx="26" cy="26" r="7" stroke="#8D7CFF" strokeOpacity=".35" />
        <defs>
          <linearGradient id="dashboard-frame" x1="7" y1="3" x2="46" y2="49" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F1EEFF" stopOpacity=".72" /><stop offset=".48" stopColor="#7867F8" stopOpacity=".4" /><stop offset="1" stopColor="#F2CDAA" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id="dashboard-signal" x1="10" y1="12" x2="43" y2="41" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F7F5FF" /><stop offset=".48" stopColor="#8775FF" /><stop offset="1" stopColor="#E9C8AB" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <p className={`text-[17px] font-semibold leading-none tracking-[0.2em] ${foreground}`} aria-label={brand.name}>
          <span className="font-serif text-[20px] font-normal">V</span>AI<span className="text-[#8d7cff]">X</span>IO
        </p>
        {showTagline && <p className={`mt-1.5 text-[9px] tracking-[0.05em] ${secondary}`}>{brand.tagline}</p>}
      </div>
    </div>
  );
}
