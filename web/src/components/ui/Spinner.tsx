export function Spinner({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-[#e7e4eb] bg-white py-16 text-sm text-[#7c7583] shadow-[0_16px_45px_rgba(30,23,48,.04)]" role="status">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#ddd8e5] border-t-brand-600" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
