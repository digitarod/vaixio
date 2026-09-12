interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-[#e7e4eb] bg-white p-6 shadow-[0_16px_45px_rgba(30,23,48,.055)] ${className}`}>{children}</div>
  );
}
