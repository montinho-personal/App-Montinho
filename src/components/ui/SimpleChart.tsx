type SimpleBarsProps = {
  data: Array<{ label: string; value: number }>;
  height?: number;
  tone?: "accent" | "gold" | "success";
  className?: string;
};

const TONE = {
  accent: "var(--color-accent)",
  gold: "var(--color-gold)",
  success: "var(--color-success)",
};

export function SimpleBars({
  data,
  height = 120,
  tone = "accent",
  className = "",
}: SimpleBarsProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={`flex items-end gap-2 ${className}`} style={{ height }}>
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="text-[10px] text-fg-subtle font-mono">{d.value}</div>
            <div
              className="w-full rounded-t-md transition-all"
              style={{ height: `${h}%`, background: TONE[tone] }}
            />
            <div className="text-[10px] text-fg-subtle">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

type SimpleLineProps = {
  data: number[];
  height?: number;
  width?: number;
  tone?: "accent" | "gold" | "success";
  className?: string;
};

export function SimpleLine({
  data,
  height = 60,
  width = 200,
  tone = "accent",
  className = "",
}: SimpleLineProps) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <polygon points={areaPoints} fill={TONE[tone]} fillOpacity="0.15" />
      <polyline
        points={points}
        fill="none"
        stroke={TONE[tone]}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
