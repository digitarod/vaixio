interface BadgeProps {
  children: React.ReactNode;
  tone?: "green" | "red" | "slate" | "amber";
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
};

export function Badge({ children, tone = "slate" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
