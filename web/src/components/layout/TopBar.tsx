import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { BrandLockup } from "../brand/BrandLockup";
import { Button } from "../ui/Button";

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#e8e5ed] bg-white/88 backdrop-blur-xl">
      <div className="flex h-[74px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <div className="lg:hidden">
          <BrandLockup compact />
        </div>
        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_#34d399]" aria-hidden="true" />
          <span className="font-mono text-[9px] tracking-[0.17em] text-[#817b89]">VAIXIO CONTROL ROOM</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0eef6] text-xs font-semibold text-brand-700">
                {user.email.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-44 truncate text-xs text-[#706a78]">{user.email}</span>
            </div>
          )}
          <Button variant="secondary" onClick={handleLogout}>ログアウト</Button>
        </div>
      </div>
    </header>
  );
}
