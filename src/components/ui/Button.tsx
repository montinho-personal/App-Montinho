import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold" | "success";
type Size = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

// Texto escuro sobre o dourado: contraste ≥ 7:1 (WCAG AA/AAA). Texto claro sobre dourado não passa.
const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-bg hover:bg-accent-hover active:bg-accent-press disabled:bg-accent/50",
  secondary: "bg-card text-fg border border-border hover:bg-card-hover hover:border-border-strong",
  ghost: "bg-transparent text-fg hover:bg-card",
  danger: "bg-red/15 text-red border border-red/40 hover:bg-red/25",
  gold: "bg-gold text-bg hover:brightness-110 font-bold",
  success: "bg-success text-bg hover:brightness-110 font-bold",
};

const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-md",
  md: "h-11 px-5 text-sm rounded-lg",
  lg: "h-12 px-7 text-base rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, className = "", children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...rest}
    >
      {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
});
