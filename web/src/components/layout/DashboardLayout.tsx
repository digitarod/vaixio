import { NavLink, Outlet } from "react-router-dom";
import { BrandLockup } from "../brand/BrandLockup";
import { TopBar } from "./TopBar";

const NAV_BASE = "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all";
const NAV_ACTIVE = "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.06)]";
const NAV_INACTIVE = "text-white/48 hover:bg-white/[0.05] hover:text-white/82";
const MOBILE_BASE = "relative flex-1 px-3 py-3 text-center text-xs font-medium transition-colors";

function Navigation({ mobile = false }: { mobile?: boolean }) {
  if (mobile) {
    return (
      <nav className="flex border-b border-[#e6e3eb] bg-white/92 px-4 backdrop-blur-xl lg:hidden" aria-label="メインナビゲーション">
        <NavLink to="/connections" className={({ isActive }) => `${MOBILE_BASE} ${isActive ? "text-brand-700 after:absolute after:inset-x-5 after:bottom-0 after:h-0.5 after:bg-brand-600" : "text-[#77717e]"}`}>連携サービス</NavLink>
        <NavLink to="/audit" className={({ isActive }) => `${MOBILE_BASE} ${isActive ? "text-brand-700 after:absolute after:inset-x-5 after:bottom-0 after:h-0.5 after:bg-brand-600" : "text-[#77717e]"}`}>実行履歴</NavLink>
      </nav>
    );
  }

  return (
    <nav className="mt-12 space-y-1.5" aria-label="メインナビゲーション">
      <p className="mb-4 px-3.5 font-mono text-[8px] tracking-[0.19em] text-white/25">WORKSPACE</p>
      <NavLink to="/connections" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
        {({ isActive }) => <><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#a596ff] shadow-[0_0_10px_#8d7cff]" : "bg-white/20"}`} /><span>連携サービス</span><span className="ml-auto font-mono text-[8px] tracking-wider text-white/25">01</span></>}
      </NavLink>
      <NavLink to="/audit" className={({ isActive }) => `${NAV_BASE} ${isActive ? NAV_ACTIVE : NAV_INACTIVE}`}>
        {({ isActive }) => <><span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#a596ff] shadow-[0_0_10px_#8d7cff]" : "bg-white/20"}`} /><span>実行履歴</span><span className="ml-auto font-mono text-[8px] tracking-wider text-white/25">02</span></>}
      </NavLink>
    </nav>
  );
}

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#f6f5f8] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="relative hidden h-screen flex-col overflow-hidden bg-[#0b0a10] px-5 py-7 lg:sticky lg:top-0 lg:flex">
        <div className="pointer-events-none absolute -right-24 top-10 h-60 w-60 rounded-full bg-brand-600/15 blur-3xl" aria-hidden="true" />
        <div className="relative"><BrandLockup tone="light" showTagline /></div>
        <Navigation />
        <div className="relative mt-auto border-t border-white/[0.08] pt-5">
          <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.14em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> ALL SYSTEMS OPERATIONAL
          </div>
          <p className="mt-2 text-[10px] leading-4 text-white/25">Human clarity. Agent-ready infrastructure.</p>
        </div>
      </aside>
      <div className="min-w-0">
        <TopBar />
        <Navigation mobile />
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
