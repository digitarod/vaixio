interface AlertProps {
  children: React.ReactNode;
  variant?: "error" | "warning" | "info";
}

const VARIANT_CLASSES = {
  error: "bg-red-50/80 text-red-700 border-red-200/80",
  warning: "bg-amber-50/80 text-amber-800 border-amber-200/80",
  info: "bg-brand-50/80 text-brand-800 border-brand-200/80",
};

export function Alert({ children, variant = "error" }: AlertProps) {
  return (
    <div role="alert" className={`rounded-xl border px-4 py-3.5 text-sm ${VARIANT_CLASSES[variant]}`}>
      {children}
    </div>
  );
}
