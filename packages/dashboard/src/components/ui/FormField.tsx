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
    <label className="block text-sm font-medium text-dark-300 mb-1">
      {label}
      {required && <span className="text-metro-red ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm text-metro-red mt-1 flex items-center gap-1">
        <span>⚠</span> {error}
      </p>
    )}
    {hint && !error && <p className="text-sm text-dark-500 mt-1">{hint}</p>}
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
      className={`w-full bg-dark-800 border rounded-lg px-3 py-2 text-dark-100 placeholder:text-dark-500 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors ${
        error
          ? "border-metro-red focus:ring-metro-red focus:border-metro-red"
          : "border-dark-600"
      } ${
        props.disabled ? "bg-dark-700 text-dark-500 cursor-not-allowed" : ""
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
      className={`w-full bg-dark-800 border rounded-lg px-3 py-2 text-dark-100 placeholder:text-dark-500 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors resize-none ${
        error
          ? "border-metro-red focus:ring-metro-red focus:border-metro-red"
          : "border-dark-600"
      } ${
        props.disabled ? "bg-dark-700 text-dark-500 cursor-not-allowed" : ""
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
      className={`w-full bg-dark-800 border rounded-lg px-3 py-2 text-dark-100 focus:ring-2 focus:ring-metro-orange focus:border-metro-orange transition-colors ${
        error
          ? "border-metro-red focus:ring-metro-red focus:border-metro-red"
          : "border-dark-600"
      } ${
        props.disabled ? "bg-dark-700 text-dark-500 cursor-not-allowed" : ""
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
