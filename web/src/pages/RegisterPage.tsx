import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/layout/AuthLayout";
import { RegisterForm } from "../components/forms/RegisterForm";

export function RegisterPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();

  async function handleSuccess() {
    await refresh();
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout
      title="新規登録"
      footer={
        <>
          既にアカウントをお持ちの方は{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            ログイン
          </Link>
        </>
      }
    >
      <RegisterForm onSuccess={handleSuccess} />
    </AuthLayout>
  );
}
