import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/layout/AuthLayout";
import { LoginForm } from "../components/forms/LoginForm";

export function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSuccess() {
    await refresh();
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout
      title="ログイン"
      footer={
        <>
          アカウントをお持ちでない方は{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            新規登録
          </Link>
        </>
      }
    >
      <LoginForm onSuccess={handleSuccess} />
    </AuthLayout>
  );
}
