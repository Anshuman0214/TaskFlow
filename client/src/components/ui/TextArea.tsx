import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | undefined;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, id, className = "", ...rest }, ref) => {
    const fieldId = id ?? rest.name;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
          {label}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          rows={3}
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

TextArea.displayName = "TextArea";
