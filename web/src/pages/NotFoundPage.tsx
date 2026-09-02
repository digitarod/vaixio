import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <p className="text-6xl font-semibold text-slate-300">404</p>
      <p className="text-lg font-medium text-slate-700">ページが見つかりませんでした</p>
      <p className="max-w-sm text-sm text-slate-500">
        URLが正しいかご確認いただくか、トップページからやり直してください。
      </p>
      <Link to="/">
        <Button>トップに戻る</Button>
      </Link>
    </div>
  );
}
