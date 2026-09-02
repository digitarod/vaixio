import { brand } from "../../config/brand";
import { Card } from "../ui/Card";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** ログイン/新規登録ページ共通の中央寄せカードレイアウト。 */
export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-2xl font-semibold tracking-tight text-slate-900">{brand.name}</p>
        <p className="mt-1 text-sm text-slate-500">{brand.tagline}</p>
      </div>
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-lg font-semibold text-slate-900">{title}</h1>
        {children}
      </Card>
      {footer && <div className="mt-6 text-sm text-slate-500">{footer}</div>}
    </div>
  );
}
