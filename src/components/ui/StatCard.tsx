import { Card, CardBody } from "./Card";

type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "accent" | "gold" | "red" | "success" | "warning";
  trend?: { value: string; direction: "up" | "down" | "flat" };
};

const TONE_TEXT = {
  neutral: "text-fg",
  accent: "text-accent",
  gold: "text-gold",
  red: "text-red",
  success: "text-success",
  warning: "text-warning",
};

const TREND_TEXT = {
  up: "text-success",
  down: "text-red",
  flat: "text-fg-subtle",
};

const TREND_ARROW = {
  up: "▲",
  down: "▼",
  flat: "—",
};

export function StatCard({ label, value, hint, tone = "neutral", trend }: StatCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="text-[11px] text-fg-subtle uppercase tracking-wider font-semibold">
          {label}
        </div>
        <div className={`text-3xl font-bold mt-2 ${TONE_TEXT[tone]}`}>{value}</div>
        <div className="flex items-center justify-between mt-2">
          {hint ? <div className="text-xs text-fg-subtle">{hint}</div> : <div />}
          {trend ? (
            <div className={`text-xs font-semibold ${TREND_TEXT[trend.direction]}`}>
              {TREND_ARROW[trend.direction]} {trend.value}
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
