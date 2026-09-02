import { NavLink, Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

const TAB_BASE =
  "border-b-2 px-1 py-3 text-sm font-medium transition-colors";
const TAB_ACTIVE = "border-brand-600 text-brand-700";
const TAB_INACTIVE = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar />
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-6 px-6">
          <NavLink to="/connections" className={({ isActive }) => `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}>
            連携サービス
          </NavLink>
          <NavLink to="/audit" className={({ isActive }) => `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_INACTIVE}`}>
            実行履歴
          </NavLink>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
