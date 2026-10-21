"use client";

// Caminho semana a semana da Jornada do Chalalá. Mesmos dados do componente
// atual (CaminhoJornada), com um desenho que não depende só de cor: cada
// estado tem um símbolo (✓ feita, ◐ parcial, ○ sem treino, ⏸ pausa, ↺ volta)
// e cada fase tem um ícone (⛺ adaptação, 🔥 intensificação, 🏔 consolidação).
import { useState } from "react";
import type { CaminhoJornada, SemanaCaminho } from "@/lib/conquistas/jornada";
import { FASES, FASE_INFO, ehFase } from "@/lib/treino/fases";
import { FALAS_CHALALA } from "@/lib/jornada-chalala/universo";
import { PersonagemBotao } from "./Personagens";
import type { PersonagemChalala } from "@/lib/jornada-chalala/universo";

const OURO = "#BA9E50";
const COLS = 7;
const DX = 48;
const DY = 96;
const X0 = 36;
const Y0 = 70;
const MAX = 28;
const ICONE_FASE = { adaptacao: "⛺", intensificacao: "🔥", consolidacao: "🏔" } as const;

const cor = (w: SemanaCaminho) => (w.fase && ehFase(w.fase) ? FASE_INFO[w.fase].cor : OURO);
const estado = (w: SemanaCaminho) => (w.status === "pausada" ? "pausa" : w.treinos > 0 ? (w.status === "parcial" ? "parcial" : "feita") : w.status === "em_andamento" ? "andamento" : "parada");
const curta = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function CaminhoChalala({ caminho, onAbrirPersonagem }: { caminho: CaminhoJornada; onAbrirPersonagem: (id: PersonagemChalala["id"]) => void }) {
  const [tudo, setTudo] = useState(false);
  const primeiro = caminho.semanas.findIndex((w) => w.treinos > 0);
  const todas = primeiro < 0 ? [] : caminho.semanas.slice(primeiro).filter((w) => w.status !== "sem_prescricao" || w.treinos > 0);
  if (!todas.length) return null;
  const semanas = tudo ? todas : todas.slice(-MAX);
  const linhas = Math.ceil(semanas.length / COLS);
  const altura = Y0 + (linhas - 1) * DY + 56;
  const pts = semanas.map((w, i) => {
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    return { w, x: X0 + (r % 2 === 0 ? c : COLS - 1 - c) * DX, y: Y0 + r * DY };
  });
  const atual = caminho.faseAtual && ehFase(caminho.faseAtual) ? caminho.faseAtual : null;
  const concluidas = new Set(caminho.fasesConcluidas.map((f) => f.fase));

  return (
    <section className="space-y-3 rounded-3xl border border-border bg-[#171B21] p-3" aria-label="Seu caminho semana a semana">
      <div className="flex items-start gap-2">
        <PersonagemBotao id="oogway" tamanho={56} onAbrir={onAbrirPersonagem} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Fases do seu protocolo</p>
          <p className="text-xs text-fg-muted">{atual ? FASE_INFO[atual].resumo : "As fases aparecem aqui quando o Montinho definir a fase do seu protocolo."}</p>
        </div>
      </div>
      <ol className="grid grid-cols-3 gap-1.5">
        {FASES.map((f) => {
          const info = FASE_INFO[f];
          const ehAtual = atual === f;
          const feita = concluidas.has(f);
          return (
            <li key={f} className="rounded-2xl border px-2 py-2 text-center" style={{ borderColor: ehAtual || feita ? info.cor : "var(--color-border)", background: ehAtual ? `${info.cor}22` : undefined, opacity: ehAtual || feita ? 1 : 0.55 }}>
              <span className="block text-lg leading-none" aria-hidden>{ICONE_FASE[f]}</span>
              <span className="mt-1 block text-[11px] font-bold leading-tight" style={{ color: ehAtual || feita ? info.cor : undefined }}>{info.rotulo}</span>
              <span className="block text-[10px] text-fg-muted">{ehAtual ? "você está aqui" : feita ? "concluída ✓" : "mais adiante"}</span>
            </li>
          );
        })}
      </ol>

      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Seu caminho, semana a semana</p>
        {todas.length > MAX ? (
          <button type="button" onClick={() => setTudo((v) => !v)} className="text-[11px] font-semibold text-fg-muted underline-offset-2 hover:underline">
            {tudo ? "Ver só as últimas" : `Ver todas (${todas.length})`}
          </button>
        ) : null}
      </div>
      <svg viewBox={`0 0 360 ${altura}`} className="w-full" role="img" aria-label={`${semanas.length} semanas de acompanhamento, ${caminho.retornos} retorno(s) depois de pausa`}>
        {pts.slice(1).map((p, i) => {
          const a = pts[i];
          const e = estado(p.w);
          const inativa = e === "parada" || e === "pausa";
          const d = a.y === p.y ? `M${a.x} ${a.y} L${p.x} ${p.y}` : `M${a.x} ${a.y} C${a.x + (a.x > 180 ? 34 : -34)} ${a.y} ${p.x + (p.x > 180 ? 34 : -34)} ${p.y} ${p.x} ${p.y}`;
          return <path key={p.w.inicio} d={d} fill="none" stroke={inativa ? "#3a3f46" : cor(p.w)} strokeWidth={inativa ? 3 : 6} strokeDasharray={e === "pausa" ? "2 6" : e === "parada" ? "6 6" : undefined} strokeLinecap="round" opacity={inativa ? 0.8 : 0.95} />;
        })}
        {pts.map((p, i) => {
          const c = cor(p.w);
          const e = estado(p.w);
          const feita = e === "feita" || e === "parcial";
          const agora = e === "andamento" || i === pts.length - 1;
          return (
            <g key={p.w.inicio}>
              {agora ? <circle cx={p.x} cy={p.y} r={17} fill="none" stroke={OURO} strokeWidth={2} strokeDasharray="3 3" /> : null}
              <circle cx={p.x} cy={p.y} r={12} fill={feita ? c : "#171B21"} fillOpacity={e === "parcial" ? 0.5 : 1} stroke={feita ? c : "#3a3f46"} strokeWidth={2.2} />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={feita ? 10 : 11} fontWeight="800" fill={feita ? "#111" : "#9a9a9a"}>
                {e === "pausa" ? "⏸" : e === "feita" ? p.w.treinos : e === "parcial" ? "◐" : e === "andamento" ? "…" : "○"}
              </text>
              {p.w.retorno ? (
                <g>
                  <rect x={p.x - 26} y={p.y - (p.w.novaFase ? 64 : 38)} width={52} height={17} rx={8.5} fill={OURO} />
                  <text x={p.x} y={p.y - (p.w.novaFase ? 52 : 26)} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#111">↺ voltei</text>
                </g>
              ) : null}
              {p.w.novaFase && ehFase(p.w.novaFase) ? (
                <g>
                  <line x1={p.x} y1={p.y - 13} x2={p.x} y2={p.y - 32} stroke={FASE_INFO[p.w.novaFase].cor} strokeWidth={1.5} />
                  <path d={`M${p.x} ${p.y - 32} L${p.x + 14} ${p.y - 28} L${p.x} ${p.y - 24} Z`} fill={FASE_INFO[p.w.novaFase].cor} />
                  <text x={p.x + 2} y={p.y - 36} fontSize="9" fontWeight="700" fill={FASE_INFO[p.w.novaFase].cor} textAnchor={p.x > 300 ? "end" : "start"}>{ICONE_FASE[p.w.novaFase]} {FASE_INFO[p.w.novaFase].rotulo}</text>
                </g>
              ) : null}
              <text x={p.x} y={p.y + 27} textAnchor="middle" fontSize="8.5" fill="#7a7a7a">{curta(p.w.inicio)}</text>
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-fg-muted">
        {FASES.map((f) => (
          <li key={f} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full" style={{ background: FASE_INFO[f].cor }} aria-hidden />{ICONE_FASE[f]} {FASE_INFO[f].rotulo}</li>
        ))}
        <li>número = treinos na semana</li>
        <li>◐ semana parcial</li>
        <li>○ - - - semana parada</li>
        <li>⏸ pausa combinada</li>
        <li>↺ voltou depois de parar</li>
      </ul>
      {caminho.retornos ? (
        <div className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 p-2.5">
          <PersonagemBotao id="fenix" tamanho={44} onAbrir={onAbrirPersonagem} />
          <p className="text-xs"><span className="font-bold">{FALAS_CHALALA.retorno}</span> <span className="text-fg-muted">Você já voltou {caminho.retornos === 1 ? "1 vez" : `${caminho.retornos} vezes`}. Voltar faz parte do caminho.</span></p>
        </div>
      ) : null}
    </section>
  );
}
