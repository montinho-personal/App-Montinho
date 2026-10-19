import { InputHTMLAttributes, LabelHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`h-11 w-full rounded-lg bg-bg border border-border px-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors ${className}`}
        {...rest}
      />
    );
  }
);

export function Label({ className = "", ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-sm font-medium text-fg-muted mb-2 block ${className}`}
      {...rest}
    />
  );
}

export function FieldHint({ children, error }: { children?: React.ReactNode; error?: boolean }) {
  if (!children) return null;
  return (
    <p className={`text-xs mt-1.5 ${error ? "text-danger" : "text-fg-subtle"}`}>
      {children}
    </p>
  );
}
