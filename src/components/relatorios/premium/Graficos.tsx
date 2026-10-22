// Gráficos do relatório premium em SVG puro (renderizados no servidor e
// impressos igual à tela). Cores fixas do documento: papel claro, tinta escura
// e dourado da marca.
import type { PontoEvolucao } from "@/lib/relatorios/calcular";
import type { SemanaVolume } from "@/lib/relatorios/premium";

const OURO = "#ba9e50";
const TINTA = "#1a1814";
const SUAVE = "#8a8273";
const GRADE = "#e4dfd3";
const br = (v: number, casas = 1) => v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Carga máxima por dia (linha dourada) e força estimada (tracejada). */
export function LinhaCarga({ pontos, altura = 150 }: { pontos: PontoEvolucao[]; altura?: number }) {
  const L = 340;
  const m = { e: 34, d: 10, t: 12, b: 22 };
  const valores = pontos.flatMap((p) => [p.cargaMax ?? 0, p.e1rmMax ?? 0]).filter((v) => v > 0);
  const max = Math.max(...valores);
  const min = Math.min(...pontos.map((p) => p.cargaMax ?? max));
  const lo = Math.max(0, Math.floor((min * 0.9) / 5) * 5);
  const hi = Math.ceil((max * 1.05) / 5) * 5 || 5;
  const x = (i: number) => m.e + (pontos.length === 1 ? (L - m.e - m.d) / 2 : (i * (L - m.e - m.d)) / (pontos.length - 1));
  const y = (v: number) => m.t + (altura - m.t - m.b) * (1 - (v - lo) / (hi - lo || 1));
  const linha = (k: "cargaMax" | "e1rmMax") =>
    pontos
      .map((p, i) => (p[k] != null ? `${x(i)},${y(p[k]!)}` : null))
      .filter(Boolean)
      .join(" ");
  const ticks = [lo, (lo + hi) / 2, hi];
  const temE1 = pontos.filter((p) => p.e1rmMax != null).length >= 2;
  return (
    <svg viewBox={`0 0 ${L} ${altura}`} className="h-auto w-full" role="img" aria-label="Carga máxima por treino">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={m.e} x2={L - m.d} y1={y(t)} y2={y(t)} stroke={GRADE} strokeWidth="1" />
          <text x={m.e - 4} y={y(t) + 3} textAnchor="end" fontSize="9" fill={SUAVE}>{br(t, 0)}</text>
        </g>
      ))}
      {temE1 ? <polyline points={linha("e1rmMax")} fill="none" stroke={SUAVE} strokeWidth="1.2" strokeDasharray="3 3" /> : null}
      <polyline points={linha("cargaMax")} fill="none" stroke={OURO} strokeWidth="2.2" strokeLinejoin="round" />
      {pontos.map((p, i) => (p.cargaMax != null ? <circle key={p.data} cx={x(i)} cy={y(p.cargaMax)} r={i === pontos.length - 1 ? 3.6 : 2.2} fill={i === pontos.length - 1 ? TINTA : OURO} /> : null))}
      <text x={x(0)} y={altura - 6} fontSize="9" fill={SUAVE} textAnchor="start">{dm(pontos[0].data)}</text>
      <text x={x(pontos.length - 1)} y={altura - 6} fontSize="9" fill={SUAVE} textAnchor="end">{dm(pontos.at(-1)!.data)}</text>
    </svg>
  );
}

/** Mini linha sem eixos, para a tabela por músculo. */
export function MiniLinha({ pontos }: { pontos: PontoEvolucao[] }) {
  const v = pontos.map((p) => p.cargaMax ?? 0);
  const max = Math.max(...v);
  const min = Math.min(...v);
  const W = 84;
  const H = 22;
  const pts = v.map((c, i) => `${(i * W) / Math.max(1, v.length - 1)},${H - 2 - ((c - min) / (max - min || 1)) * (H - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
      <polyline points={pts} fill="none" stroke={OURO} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Volume (carga × repetições) por semana, em toneladas. */
export function BarrasSemanas({ semanas }: { semanas: SemanaVolume[] }) {
  const L = 640;
  const A = 170;
  const m = { e: 34, d: 6, t: 14, b: 22 };
  const max = Math.max(1, ...semanas.map((s) => s.tonelagem));
  const larg = (L - m.e - m.d) / Math.max(1, semanas.length);
  const y = (v: number) => m.t + (A - m.t - m.b) * (1 - v / max);
  const passo = Math.max(1, Math.ceil(semanas.length / 8));
  return (
    <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Volume por semana">
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={m.e} x2={L - m.d} y1={y(t)} y2={y(t)} stroke={GRADE} />
          <text x={m.e - 4} y={y(t) + 3} fontSize="9" textAnchor="end" fill={SUAVE}>{br(t / 1000)} t</text>
        </g>
      ))}
      {semanas.map((s, i) => (
        <g key={s.inicio}>
          <rect x={m.e + i * larg + larg * 0.15} y={y(s.tonelagem)} width={larg * 0.7} height={Math.max(0, A - m.b - y(s.tonelagem))} rx="2" fill={i === semanas.length - 1 ? TINTA : OURO} />
          {i % passo === 0 ? <text x={m.e + i * larg + larg / 2} y={A - 7} fontSize="9" textAnchor="middle" fill={SUAVE}>{dm(s.inicio)}</text> : null}
        </g>
      ))}
    </svg>
  );
}

/** Antes × agora em duas barras horizontais (destaques). */
export function AntesAgora({ antes, agora, max }: { antes: number; agora: number; max: number }) {
  const w = (v: number) => `${Math.max(4, (v / (max || 1)) * 100)}%`;
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-[#e4dfd3]"><div className="h-2 rounded-full bg-[#8a8273]" style={{ width: w(antes) }} /></div>
      <div className="h-2 rounded-full bg-[#e4dfd3]"><div className="h-2 rounded-full bg-[#ba9e50]" style={{ width: w(agora) }} /></div>
    </div>
  );
}
