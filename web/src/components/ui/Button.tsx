import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "border border-brand-600 bg-[linear-gradient(115deg,#7665ef,#5c4bd2)] text-white shadow-[0_9px_24px_rgba(94,74,210,.22)] hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-[0_13px_30px_rgba(94,74,210,.28)] focus-visible:outline-brand-600 disabled:bg-brand-300",
  secondary:
    "border border-[#dedbe4] bg-white text-[#5d5765] hover:border-[#c9c3d4] hover:bg-[#f9f8fb] focus-visible:outline-brand-600 disabled:text-slate-400",
  ghost: "border border-transparent text-[#6f6977] hover:bg-[#efedf3] focus-visible:outline-brand-600 disabled:text-slate-400",
};

export function Button({ variant = "primary", isLoading = false, disabled, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
        transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:shadow-none ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...rest}
    >
      {isLoading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
