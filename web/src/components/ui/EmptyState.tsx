interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[#d9d4e1] bg-[radial-gradient(circle_at_50%_0%,rgba(119,100,235,.09),transparent_46%),#fff] px-6 py-16 text-center shadow-[0_18px_48px_rgba(30,23,48,.04)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-600 shadow-[0_8px_24px_rgba(108,87,229,.12)]" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          <path
            d="M12 3v18M3 12h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            transform="rotate(45 12 12)"
          />
        </svg>
      </div>
      <p className="mt-2 text-base font-semibold text-[#28232e]">{title}</p>
      {description && <p className="max-w-lg text-sm leading-6 text-[#7e7785]">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
