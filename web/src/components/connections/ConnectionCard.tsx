import type { ComponentType } from "react";
import type { Connection } from "../../api/types";
import { formatExpiry, isExpired, isExpiringSoon } from "../../lib/format";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { FacebookIcon, GoogleIcon, InstagramIcon, LineIcon } from "./platform-icons";

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook_page: "Facebookページ",
  google_business_profile: "Googleビジネスプロフィール",
  line: "LINE",
};

const PLATFORM_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  instagram: InstagramIcon,
  facebook_page: FacebookIcon,
  google_business_profile: GoogleIcon,
  line: LineIcon,
};

function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

export function ConnectionCard({ connection }: { connection: Connection }) {
  const expired = isExpired(connection.expiresAt);
  const warning = isExpiringSoon(connection.expiresAt);
  const PlatformIcon = PLATFORM_ICONS[connection.platform];

  return (
    <Card className={`group relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_20px_52px_rgba(55,43,92,.09)] ${warning ? "border-amber-300" : ""}`}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {PlatformIcon && <PlatformIcon className="h-4 w-4 shrink-0" />}
            <p className="font-mono text-[9px] font-medium uppercase tracking-[0.13em] text-[#9993a0]">
              {platformLabel(connection.platform)}
            </p>
          </div>
          <p className="mt-3 truncate text-lg font-semibold tracking-[-0.025em] text-[#242029]">{connection.accountName ?? "未設定のアカウント"}</p>
        </div>
        <Badge tone="green">連携済み</Badge>
      </div>

      <div className="mt-7 flex items-center gap-2 border-t border-[#eeeaf1] pt-4">
        {warning && (
          <Badge tone={expired ? "red" : "amber"}>{expired ? "期限切れ" : "まもなく期限切れ"}</Badge>
        )}
        <p className={`text-xs ${warning ? "font-medium text-amber-700" : "text-[#89828f]"}`}>
          {formatExpiry(connection.expiresAt)}
        </p>
      </div>
    </Card>
  );
}
