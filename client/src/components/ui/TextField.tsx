import { forwardRef, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = "", ...rest }, ref) => {
    const fieldId = id ?? rest.name;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={`rounded-md border px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-900/20 ${
            error ? "border-red-400" : "border-gray-300"
          } ${className}`}
          {...rest}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  },
);

TextField.displayName = "TextField";
