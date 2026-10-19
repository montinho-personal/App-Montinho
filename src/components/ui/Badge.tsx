import { HTMLAttributes } from "react";

type Tone = "neutral" | "accent" | "gold" | "red" | "success" | "warning";

const TONE: Record<Tone, string> = {
  neutral: "bg-card text-fg-muted border-border",
  accent: "bg-accent/10 text-accent border-accent/30",
  gold: "bg-gold/10 text-gold border-gold/30",
  red: "bg-red/10 text-red border-red/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${TONE[tone]} ${className}`}
      {...rest}
    />
  );
}
