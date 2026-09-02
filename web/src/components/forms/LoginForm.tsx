import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError, login } from "../../api/client";
import { translateApiError } from "../../lib/errorMessages";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";

interface LoginFormProps {
  onSuccess: (email: string) => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
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
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full">
        ログイン
      </Button>
    </form>
  );
}
