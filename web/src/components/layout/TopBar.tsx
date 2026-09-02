import { useNavigate } from "react-router-dom";
import { brand } from "../../config/brand";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../ui/Button";

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div>
          <p className="text-lg font-semibold tracking-tight text-slate-900">{brand.name}</p>
          <p className="text-xs text-slate-400">{brand.tagline}</p>
        </div>
        <div className="flex items-center gap-4">
          {user && <span className="text-sm text-slate-500">{user.email}</span>}
          <Button variant="secondary" onClick={handleLogout}>
            ログアウト
          </Button>
        </div>
      </div>
    </header>
  );
}
