import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "./AuthContext";

/**
 * 認証必須ルートのゲート。/dashboard-api/me が401なら /login にリダイレクトする。
 * 各ページで個別にチェックを重複させないよう、ここに一箇所だけ実装する。
 */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return <Spinner label="認証状態を確認しています..." />;
  }

  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/** ログイン済みなら /login, /register にアクセスさせず / に流す。 */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <Spinner />;
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
