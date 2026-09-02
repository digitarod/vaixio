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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`rounded-lg border px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-colors
          placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100
          ${error ? "border-red-400" : "border-slate-300"} ${className}`}
        {...rest}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        helperText && <p className="text-sm text-slate-400">{helperText}</p>
      )}
    </div>
  );
}
