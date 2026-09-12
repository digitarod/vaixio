import type { InputHTMLAttributes } from "react";
import { useId } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

/** ラベル・入力・エラー文言をまとめた最小のフォームフィールド。 */
export function Field({ label, error, helperText, id, className = "", ...rest }: FieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const errorId = `${fieldId}-error`;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={fieldId} className="text-[13px] font-medium text-[#5c5663]">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-xl border bg-[#fbfafc] px-3.5 py-3 text-sm text-[#211d27] outline-none transition-all
          placeholder:text-[#aaa4ae] focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100/70
          ${error ? "border-red-400" : "border-[#dedbe3]"} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        helperText && <p className="text-xs text-[#9a949f]">{helperText}</p>
      )}
    </div>
  );
}
