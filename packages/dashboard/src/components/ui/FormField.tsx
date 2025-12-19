import React from "react";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  className = "",
  children,
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
        <span>⚠</span> {error}
      </p>
    )}
    {hint && !error && <p className="text-sm text-gray-500 mt-1">{hint}</p>}
  </div>
);

// Input variant with built-in styling
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  required,
  error,
  hint,
  className = "",
  ...props
}) => (
  <FormField label={label} required={required} error={error} hint={hint}>
    <input
      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
        error
          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300"
      } ${
        props.disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
      } ${className}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id || props.name}-error` : undefined}
      {...props}
    />
  </FormField>
);

// Textarea variant
interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  required,
  error,
  hint,
  className = "",
  rows = 3,
  ...props
}) => (
  <FormField label={label} required={required} error={error} hint={hint}>
    <textarea
      rows={rows}
      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none ${
        error
          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300"
      } ${
        props.disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
      } ${className}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id || props.name}-error` : undefined}
      {...props}
    />
  </FormField>
);

// Select variant
interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  label,
  required,
  error,
  hint,
  options,
  className = "",
  ...props
}) => (
  <FormField label={label} required={required} error={error} hint={hint}>
    <select
      className={`w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
        error
          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300"
      } ${
        props.disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""
      } ${className}`}
      aria-invalid={!!error}
      aria-describedby={error ? `${props.id || props.name}-error` : undefined}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </FormField>
);
