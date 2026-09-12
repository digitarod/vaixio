import { BrandLockup } from "../brand/BrandLockup";
import { Card } from "../ui/Card";

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** ログイン/新規登録ページ共通のブランド体験とフォームレイアウト。 */
export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(440px,1.03fr)_minmax(480px,.97fr)]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#08070c] p-10 lg:flex lg:flex-col xl:p-14" aria-label="VAIXIOについて">
        <img src="/auth-nexus.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[69%_center] opacity-55" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,12,.97)_0%,rgba(8,7,12,.7)_48%,rgba(8,7,12,.3)_100%),linear-gradient(0deg,#08070c_0%,transparent_45%)]" />
        <div className="relative z-10"><BrandLockup tone="light" showTagline /></div>
        <div className="relative z-10 mt-auto max-w-lg pb-7">
          <p className="mb-5 flex items-center gap-2.5 font-mono text-[9px] tracking-[0.18em] text-[#a698ff]"><span className="h-1.5 w-1.5 rounded-full bg-[#9b8bff] shadow-[0_0_10px_#8d7cff]" />AI-NATIVE CONNECTOR LAYER</p>
          <h2 className="text-[clamp(42px,4vw,66px)] font-medium leading-[1.12] tracking-[-0.055em] text-white">意図を、<br /><span className="bg-gradient-to-r from-white to-[#aea0ff] bg-clip-text text-transparent">安全な行動へ。</span></h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-white/48">人のための明快な操作画面と、AIエージェントのための強い基盤。その両方を、一つのVAIXIOで。</p>
          <div className="mt-9 flex gap-6 border-t border-white/10 pt-5 font-mono text-[8px] tracking-[0.14em] text-white/30"><span>MCP FIRST</span><span>TRACEABLE</span><span>SECURE</span></div>
        </div>
      </section>

      <section className="relative flex min-h-screen flex-col bg-[#fbfafc] px-5 py-7 sm:px-10 lg:px-[clamp(48px,6vw,96px)] lg:py-10">
        <div className="mb-10 lg:hidden"><BrandLockup showTagline /></div>
        <div className="m-auto w-full max-w-[430px] py-6">
          <p className="mb-3 font-mono text-[9px] tracking-[0.17em] text-[#8a7fac]">SECURE ACCESS / VAIXIO</p>
          <Card className="border-[#e4e1e9] bg-white p-7 shadow-[0_24px_70px_rgba(30,23,48,.08)] sm:p-9">
            <h1 className="mb-2 text-2xl font-semibold tracking-[-0.035em] text-[#1a1720]">{title}</h1>
            <p className="mb-7 text-sm leading-6 text-[#88828e]">VAIXIOコントロールルームへ安全にアクセスします。</p>
            {children}
          </Card>
          {footer && <div className="mt-6 text-center text-sm text-[#77717e]">{footer}</div>}
        </div>
        <p className="text-center font-mono text-[8px] tracking-[0.13em] text-[#aaa5ae] lg:text-left">© 2026 DIGITAROD / TOKYO, JAPAN</p>
      </section>
    </div>
  );
}
