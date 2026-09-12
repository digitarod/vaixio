interface BadgeProps {
  children: React.ReactNode;
  tone?: "green" | "red" | "slate" | "amber";
}

const TONE_CLASSES: Record<NonNullable<BadgeProps["tone"]>, string> = {
  green: "bg-emerald-50/80 text-emerald-700 ring-emerald-600/18",
  red: "bg-red-50/80 text-red-700 ring-red-600/18",
  slate: "bg-[#f1eff4] text-[#6e6875] ring-[#726b7d]/15",
  amber: "bg-amber-50/80 text-amber-700 ring-amber-600/18",
};

export function Badge({ children, tone = "slate" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
