type ProgressBarProps = {
  value: number; // 0-100
  tone?: "accent" | "gold" | "success" | "red";
  className?: string;
  showLabel?: boolean;
};

const TONE = {
  accent: "bg-accent",
  gold: "bg-gold",
  success: "bg-success",
  red: "bg-red",
};

export function ProgressBar({
  value,
  tone = "accent",
  className = "",
  showLabel = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`relative w-full ${className}`}>
      <div className="h-2 w-full rounded-full bg-card overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${TONE[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <span className="text-[10px] text-fg-subtle font-medium mt-1 block">
          {pct.toFixed(0)}%
        </span>
      ) : null}
    </div>
  );
}
