import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, fetchMe, logout as apiLogout } from "../api/client";

export interface AuthUser {
  email: string;
  customerSlug: string | undefined;
}

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** /dashboard-api/me を再取得する。ログイン直後やOAuth連携から戻ってきた直後に呼ぶ。 */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser({ email: me.email, customerSlug: me.customerSlug });
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setStatus("anonymous");
        return;
      }
      // ネットワークエラー等も未ログイン扱いにして /login へ誘導する。
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await apiLogout().catch(() => undefined);
    setUser(null);
    setStatus("anonymous");
  }, []);

  return <AuthContext.Provider value={{ status, user, refresh, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の内側で使ってください");
  return ctx;
}
