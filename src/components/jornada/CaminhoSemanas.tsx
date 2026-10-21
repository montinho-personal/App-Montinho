"use client";

// Caminho semana a semana: cada ponto é uma semana. A cor é a fase do
// protocolo (adaptação, intensificação, consolidação); pausas e retornos
// aparecem no desenho (⏸ pausa combinada, trecho apagado = semanas paradas,
// ↺ = voltei). Acima, as três fases com a atual em destaque.
import { useState } from "react";
import type { CaminhoJornada, SemanaCaminho } from "@/lib/conquistas/jornada";
import { FASES, FASE_INFO, ehFase } from "@/lib/treino/fases";

const OURO = "#ba9e50";
const COLS = 7;
const DX = 48;
const DY = 74;
const X0 = 36;
const Y0 = 44;
const MAX_SEMANAS = 28;

const corDaSemana = (w: SemanaCaminho) => (w.fase && ehFase(w.fase) ? FASE_INFO[w.fase].cor : OURO);
const treinou = (w: SemanaCaminho) => w.treinos > 0;
const dataCurta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function CaminhoSemanas({ caminho }: { caminho: CaminhoJornada }) {
  const [tudo, setTudo] = useState(false);
  // O caminho começa no primeiro treino (semanas vazias antes dele não entram).
  const primeiro = caminho.semanas.findIndex((w) => w.treinos > 0);
  const todas = primeiro < 0 ? [] : caminho.semanas.slice(primeiro).filter((w) => w.status !== "sem_prescricao" || w.treinos > 0);
  if (!todas.length) return null;
  const semanas = tudo ? todas : todas.slice(-MAX_SEMANAS);
  const linhas = Math.ceil(semanas.length / COLS);
  const altura = Y0 + (linhas - 1) * DY + 50;
  const pts = semanas.map((w, i) => {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    return { w, x: X0 + (r % 2 === 0 ? c : COLS - 1 - c) * DX, y: Y0 + r * DY };
  });
  const atual = caminho.faseAtual && ehFase(caminho.faseAtual) ? caminho.faseAtual : null;
  const concluidas = new Set(caminho.fasesConcluidas.map((f) => f.fase));

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-3" aria-label="Seu caminho semana a semana">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Fases do seu protocolo</p>
        <ol className="grid grid-cols-3 gap-1.5">
          {FASES.map((f, i) => {
            const info = FASE_INFO[f];
            const ehAtual = atual === f;
            const feita = concluidas.has(f);
            return (
              <li key={f} className="relative rounded-xl border px-2 py-2 text-center" style={{ borderColor: ehAtual || feita ? info.cor : "var(--color-border)", background: ehAtual ? `${info.cor}22` : undefined, opacity: ehAtual || feita ? 1 : 0.55 }}>
                <span className="block text-lg leading-none" aria-hidden>{["⛺", "🔥", "🏔️"][i]}</span>
                <span className="mt-1 block text-[11px] font-bold leading-tight" style={{ color: ehAtual || feita ? info.cor : undefined }}>{info.rotulo}</span>
                <span className="block text-[10px] text-fg-muted">{ehAtual ? "você está aqui" : feita ? "concluída ✓" : "—"}</span>
              </li>
            );
          })}
        </ol>
        {atual ? <p className="text-xs text-fg-muted">{FASE_INFO[atual].resumo}</p> : <p className="text-xs text-fg-muted">As fases aparecem aqui quando o Montinho definir a fase do seu protocolo.</p>}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Seu caminho, semana a semana</p>
          {todas.length > MAX_SEMANAS ? (
            <button type="button" onClick={() => setTudo((v) => !v)} className="text-[11px] font-semibold text-fg-muted underline-offset-2 hover:underline">
              {tudo ? "Ver só as últimas" : `Ver todas (${todas.length})`}
            </button>
          ) : null}
        </div>
        <svg viewBox={`0 0 360 ${altura}`} className="mt-1 w-full" role="img" aria-label={`${semanas.length} semanas de acompanhamento, ${caminho.retornos} retorno(s) depois de pausa`}>
          {pts.slice(1).map((p, i) => {
            const a = pts[i];
            const parado = !treinou(p.w) && p.w.status !== "pausada" && !p.w.status.startsWith("em_");
            const pausa = p.w.status === "pausada";
            const mesmaLinha = a.y === p.y;
            const d = mesmaLinha ? `M${a.x} ${a.y} L${p.x} ${p.y}` : `M${a.x} ${a.y} C${a.x + (a.x > 180 ? 34 : -34)} ${a.y} ${p.x + (p.x > 180 ? 34 : -34)} ${p.y} ${p.x} ${p.y}`;
            return <path key={p.w.inicio} d={d} fill="none" stroke={parado || pausa ? "#3a3a3a" : corDaSemana(p.w)} strokeWidth={parado || pausa ? 3 : 5} strokeDasharray={pausa ? "2 6" : parado ? "6 6" : undefined} strokeLinecap="round" opacity={parado ? 0.7 : 0.9} />;
          })}
          {pts.map((p) => {
            const cor = corDaSemana(p.w);
            const t = treinou(p.w);
            const pausa = p.w.status === "pausada";
            const agora = p.w.status === "em_andamento" || p === pts.at(-1);
            return (
              <g key={p.w.inicio}>
                {agora ? <circle cx={p.x} cy={p.y} r={16} fill="none" stroke={OURO} strokeWidth={2} strokeDasharray="3 3" /> : null}
                <circle cx={p.x} cy={p.y} r={11} fill={t ? cor : "#141414"} fillOpacity={t ? (p.w.status === "parcial" ? 0.55 : 1) : 1} stroke={t ? cor : "#3a3a3a"} strokeWidth={2} />
                {pausa ? <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fill="#9a9a9a">⏸</text> : t ? <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#111">{p.w.treinos}</text> : null}
                {p.w.retorno ? (
                  <g>
                    <rect x={p.x - 24} y={p.y - 36} width={48} height={16} rx={8} fill={OURO} />
                    <text x={p.x} y={p.y - 24.5} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#111">↺ voltei</text>
                  </g>
                ) : p.w.novaFase && ehFase(p.w.novaFase) ? (
                  <g>
                    <line x1={p.x} y1={p.y - 12} x2={p.x} y2={p.y - 30} stroke={FASE_INFO[p.w.novaFase].cor} strokeWidth={1.5} />
                    <path d={`M${p.x} ${p.y - 30} L${p.x + 14} ${p.y - 26} L${p.x} ${p.y - 22} Z`} fill={FASE_INFO[p.w.novaFase].cor} />
                    <text x={p.x + 2} y={p.y - 34} fontSize="9" fontWeight="700" fill={FASE_INFO[p.w.novaFase].cor} textAnchor={p.x > 300 ? "end" : "start"}>{FASE_INFO[p.w.novaFase].rotulo}</text>
                  </g>
                ) : null}
                <text x={p.x} y={p.y + 25} textAnchor="middle" fontSize="8.5" fill="#7a7a7a">{dataCurta(p.w.inicio)}</text>
              </g>
            );
          })}
        </svg>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-muted">
          {FASES.map((f) => (
            <li key={f} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FASE_INFO[f].cor }} aria-hidden />{FASE_INFO[f].rotulo}</li>
          ))}
          <li className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: OURO }} aria-hidden />treinou (sem fase)</li>
          <li>número = treinos na semana</li>
          <li>- - - semana parada</li>
          <li>⏸ pausa combinada</li>
          <li>↺ voltou depois de parar</li>
        </ul>
        {caminho.retornos ? <p className="mt-1 text-xs text-fg-muted">Você já voltou {caminho.retornos === 1 ? "1 vez" : `${caminho.retornos} vezes`} depois de uma pausa. Voltar faz parte do caminho.</p> : null}
      </div>
    </section>
  );
}
