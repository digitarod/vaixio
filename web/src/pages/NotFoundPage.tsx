import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,rgba(111,92,231,.09),transparent_32%),#f6f5f8] px-4 text-center">
      <p className="font-mono text-7xl font-light tracking-[-0.06em] text-[#c7c0d2]">404</p>
      <p className="text-lg font-semibold tracking-[-0.02em] text-[#332e39]">ページが見つかりませんでした</p>
      <p className="max-w-sm text-sm leading-6 text-[#7d7684]">
        URLが正しいかご確認いただくか、トップページからやり直してください。
      </p>
      <Link to="/">
        <Button>トップに戻る</Button>
      </Link>
    </div>
  );
}
