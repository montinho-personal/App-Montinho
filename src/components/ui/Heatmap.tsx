type HeatmapDay = {
  data: string;       // YYYY-MM-DD
  intensidade: number; // 0-4
  tooltip?: string;
};

type HeatmapProps = {
  dias: HeatmapDay[];
  className?: string;
};

const NIVEIS = [
  "bg-card",
  "bg-accent/25",
  "bg-accent/50",
  "bg-accent/75",
  "bg-accent",
] as const;

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Mostra os últimos 84 dias (12 semanas) em grid 7x12.
 * Use `dias` mapeando data → intensidade 0-4.
 */
export function Heatmap({ dias, className = "" }: HeatmapProps) {
  const total = 84; // 12 semanas
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Gerar os 84 dias retroativos
  const grid: Array<HeatmapDay & { dataObj: Date }> = [];
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const match = dias.find((x) => x.data === iso);
    grid.push({
      data: iso,
      intensidade: match?.intensidade ?? 0,
      tooltip: match?.tooltip,
      dataObj: d,
    });
  }

  // Agrupar em colunas de 7 (semanas)
  const colunas: typeof grid[] = [];
  // Primeira coluna pode ser parcial; começamos pelo dia da semana do primeiro dia
  const offset = grid[0].dataObj.getDay();
  const primeiraColuna = grid.slice(0, 7 - offset);
  colunas.push(Array.from({ length: offset }).map(() => ({ data: "", intensidade: -1, dataObj: new Date(0) })).concat(primeiraColuna));

  for (let i = 7 - offset; i < grid.length; i += 7) {
    colunas.push(grid.slice(i, i + 7));
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="flex flex-col gap-1 text-[9px] text-fg-subtle pt-0.5">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="w-3 h-3 flex items-center justify-center">
            {i % 2 === 1 ? d : ""}
          </div>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {colunas.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((cell, ri) => {
              if (cell.intensidade === -1) {
                return <div key={ri} className="w-3 h-3" />;
              }
              const nivel = Math.max(0, Math.min(4, cell.intensidade));
              return (
                <div
                  key={ri}
                  title={cell.tooltip ?? cell.data}
                  className={`w-3 h-3 rounded-[3px] ${NIVEIS[nivel]} ${
                    cell.intensidade === 0 ? "border border-border/50" : ""
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-fg-subtle">
      <span>menos</span>
      {NIVEIS.map((cls, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-[3px] ${cls} ${i === 0 ? "border border-border/50" : ""}`}
        />
      ))}
      <span>mais</span>
    </div>
  );
}
