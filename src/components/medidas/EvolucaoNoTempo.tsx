// “Evolução ao longo do tempo” na folha do relatório da avaliação (06/11/2026,
// pedido do Montinho: “coloca esse gráfico também no relatório da avaliação”).
// Sem estado (servidor e PDF): mini-gráficos das medidas principais, só com as
// avaliações ATÉ a data deste relatório. Cor neutra; quem interpreta é o Montinho.
import { dataBR } from "@/lib/format";
import type { Evolucao } from "@/lib/supabase/types";
import { resumoSerie, seriesDeMedidas, type SerieMedida } from "@/lib/medidas/series-medidas";

const br = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const un = (u: string) => (u === "%" ? "%" : u ? ` ${u}` : "");
const PRIORIDADE = ["peso_kg", "gordura_pct", "massa_magra_kg", "massa_muscular_kg", "x:massa gorda", "x:massa de gordura", "x:soma das 7 dobras", "cintura_cm", "abdomen_cm", "quadril_cm", "peito_cm", "braco_cm", "coxa_cm"];
export const MAX_GRAFICOS_RELATORIO = 8;

/** As séries que entram no relatório (até `ate`), na ordem de importância. */
export function seriesDoRelatorio(medidas: Evolucao[], ate: string): SerieMedida[] {
  const todas = seriesDeMedidas(medidas.filter((m) => m.data <= ate));
  const pos = (s: SerieMedida) => {
    const i = PRIORIDADE.indexOf(s.chave);
    return i >= 0 ? i : 100 + (s.grupo === "corpo" ? 0 : s.grupo === "circunferencias" ? 1 : s.grupo === "dobras" ? 2 : 3);
  };
  return [...todas].sort((a, b) => pos(a) - pos(b)).slice(0, MAX_GRAFICOS_RELATORIO);
}

function Mini({ s }: { s: SerieMedida }) {
  const W = 300, H = 104, PX = 10, PY = 16;
  const r = resumoSerie(s);
  const vals = s.pontos.map((p) => p.valor);
  const min = Math.min(...vals), max = Math.max(...vals);
  const folga = (max - min) * 0.2 || Math.max(0.5, max * 0.05);
  const lo = min - folga, hi = max + folga;
  const t0 = Date.parse(`${s.pontos[0].data}T12:00:00Z`), t1 = Date.parse(`${s.pontos.at(-1)!.data}T12:00:00Z`);
  const x = (d: string) => PX + ((Date.parse(`${d}T12:00:00Z`) - t0) / Math.max(1, t1 - t0)) * (W - PX * 2);
  const y = (v: number) => PY + (1 - (v - lo) / (hi - lo)) * (H - PY * 2);
  const d = s.pontos.map((p, i) => `${i ? "L" : "M"}${x(p.data).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const dif = r.diferenca;
  return (
    <div className="rounded-lg border border-[#e4dfd3] bg-white p-2.5" style={{ breakInside: "avoid" }}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[9.5pt] font-bold">{s.rotulo}</p>
        <p className="num text-[8.5pt] text-[#625c4f]">{dif === 0 ? "igual" : `${dif > 0 ? "↑ +" : "↓ −"}${br(Math.abs(dif))}${s.unidade === "%" ? " pontos" : un(s.unidade)}`}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`${s.rotulo}: ${s.pontos.length} avaliações`}>
        <line x1={PX} x2={W - PX} y1={y(min)} y2={y(min)} stroke="#e4dfd3" strokeDasharray="3 4" />
        <line x1={PX} x2={W - PX} y1={y(max)} y2={y(max)} stroke="#e4dfd3" strokeDasharray="3 4" />
        <path d={d} fill="none" stroke="#ba9e50" strokeWidth="2.2" strokeLinejoin="round" />
        {s.pontos.map((p) => <circle key={p.data} cx={x(p.data)} cy={y(p.valor)} r="2.8" fill="#fff" stroke="#8f762f" strokeWidth="1.6" />)}
        <text x={x(s.pontos[0].data)} y={y(s.pontos[0].valor) - 6} fontSize="10" fill="#625c4f" textAnchor="start">{br(r.primeiro.valor)}</text>
        <text x={x(r.ultimo.data)} y={y(r.ultimo.valor) - 6} fontSize="10" fontWeight="700" fill="#1a1814" textAnchor="end">{br(r.ultimo.valor)}</text>
      </svg>
      <div className="num flex justify-between text-[7.5pt] text-[#8a8273]">
        <span>{dataBR(r.primeiro.data)}</span>
        <span>{s.pontos.length} avaliações</span>
        <span>{dataBR(r.ultimo.data)}</span>
      </div>
    </div>
  );
}

export function EvolucaoNoTempo({ series }: { series: SerieMedida[] }) {
  if (!series.length) return null;
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 print:grid-cols-2">
      {series.map((s) => <Mini key={s.chave} s={s} />)}
    </div>
  );
}
