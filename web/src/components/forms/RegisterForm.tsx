import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, register } from "../../api/client";
import { translateApiError } from "../../lib/errorMessages";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { GoogleLoginLink } from "./GoogleLoginLink";

interface RegisterFormProps {
  onSuccess: (email: string) => void;
}

export const MIN_PASSWORD_LENGTH = 10;

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const [customerSlug, setCustomerSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`);
      return;
    }
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register(customerSlug, email, password);
      onSuccess(result.email);
    } catch (err) {
      setError(err instanceof ApiError ? translateApiError(err.code) : "通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && <Alert variant="error">{error}</Alert>}
      <Field
        label="お客様ID"
        name="customer_slug"
        required
        placeholder="例: acme-corp"
        value={customerSlug}
        onChange={(e) => setCustomerSlug(e.target.value)}
      />
      <Field
        label="メールアドレス"
        type="email"
        name="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="パスワード"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        helperText={`${MIN_PASSWORD_LENGTH}文字以上`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="パスワード（確認）"
        type="password"
        name="password_confirm"
        autoComplete="new-password"
        required
        value={passwordConfirm}
        onChange={(e) => setPasswordConfirm(e.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
        アカウントを作成
      </Button>
      <div className="flex items-center gap-3 text-xs text-slate-400" role="separator">
        <div className="h-px flex-1 bg-slate-200" />
        または
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <GoogleLoginLink customerSlug={customerSlug || undefined} />
      <p className="text-xs text-slate-400">
        Googleで登録する場合も、上の「お客様ID」欄への入力が必要です。
      </p>
    </form>
  );
}
