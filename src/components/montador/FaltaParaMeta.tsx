"use client";

// “🎯 Falta para a meta” (pedido do Montinho, 04/11/2026): no montador, logo
// acima dos treinos, os músculos que ainda não chegaram na faixa de volume
// semanal. Tocar num músculo mostra em qual treino encaixar (sugestão) e os
// exercícios da biblioteca; “＋” põe o exercício no treino com as séries que
// cobrem o que falta. A tabela de volume atualiza na hora; nada é salvo sozinho.
import { useState } from "react";
import { GRUPO_COR } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { exerciciosParaGrupo, seriesSugeridas, treinosParaEncaixar, type FaltaMeta, type TreinoParaEncaixe } from "@/lib/montador/falta-meta";
import { VerExercicio } from "@/components/ui/VerExercicio";

const numBR = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const faixa = (f: { min: number; max: number }) => (f.max > f.min ? `${f.min}–${f.max}` : `${f.min}`);

type Props = {
  faltas: FaltaMeta[];
  acima: Array<{ grupo: GrupoMuscular; label: string; passou: number }>;
  temMetas: boolean;
  treinos: TreinoParaEncaixe[];
  itens: ItemBiblioteca[];
  favoritos: Set<string>;
  uso: Map<string, number>;
  idsNoTreino: (treinoKey: string) => Set<string>;
  onAdicionar: (treinoKey: string, item: ItemBiblioteca, series: number) => void;
  onEditarMetas?: () => void;
};

export function FaltaParaMeta({ faltas, acima, temMetas, treinos, itens, favoritos, uso, idsNoTreino, onAdicionar, onEditarMetas }: Props) {
  const [aberto, setAberto] = useState<GrupoMuscular | null>(null);
  const [treinoEscolhido, setTreinoEscolhido] = useState<string | null>(null);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  if (!temMetas) {
    return (
      <div className="rounded-xl border border-dashed border-border px-3 py-2.5 text-[12px] text-fg-muted">
        🎯 Sem metas de volume ainda. Defina as faixas em <strong>Volume › Editar metas</strong> e o app mostra aqui o que falta em cada músculo enquanto você monta.
        {onEditarMetas ? <button type="button" onClick={onEditarMetas} className="ml-1 font-semibold text-accent underline">Abrir o volume</button> : null}
      </div>
    );
  }

  if (!faltas.length) {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 px-3 py-2.5 text-[12px]">
        <span className="font-bold text-success">✅ Todos os músculos com meta estão na faixa.</span>
        {acima.length ? <span className="block text-fg-muted">Passaram da faixa: {acima.map((a) => `${a.label} +${numBR(a.passou)}`).join(" · ")}</span> : null}
      </div>
    );
  }

  const atual = faltas.find((f) => f.grupo === aberto) ?? null;
  const opcoesTreino = atual ? treinosParaEncaixar(treinos, atual.grupo, atual.label) : [];
  const alvoKey = atual ? (opcoesTreino.find((t) => t.key === treinoEscolhido)?.key ?? opcoesTreino[0]?.key ?? null) : null;
  const sugeridos = atual && alvoKey ? exerciciosParaGrupo(itens, atual.grupo, { favoritos, uso, jaNoTreino: idsNoTreino(alvoKey), limite: mostrarTodos ? 30 : 6 }) : [];
  const series = atual ? seriesSugeridas(atual.falta) : 3;

  return (
    <section className="rounded-xl border border-info/40 bg-info/5 p-3" aria-label="Músculos abaixo da meta de volume">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-extrabold">🎯 Falta para a meta <span className="font-semibold text-fg-muted">· {faltas.length} {faltas.length === 1 ? "músculo" : "músculos"}</span></h3>
        <span className="text-[10px] text-fg-subtle">toque para completar</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {faltas.map((f) => {
          const pct = Math.max(0, Math.min(100, (f.valor / f.min) * 100));
          const sel = aberto === f.grupo;
          return (
            <button
              key={f.grupo}
              type="button"
              aria-expanded={sel}
              onClick={() => { setAberto(sel ? null : f.grupo); setTreinoEscolhido(null); setMostrarTodos(false); }}
              className={`relative overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-[12px] ${sel ? "border-accent bg-accent/10" : "border-border bg-card"}`}
            >
              <span className="flex items-center gap-1.5 font-bold">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GRUPO_COR[f.grupo] }} aria-hidden />
                {f.label}{f.prioritario ? " ★" : ""}
              </span>
              <span className="block text-[11px] text-fg-muted">faltam <strong className="text-info">{numBR(f.falta)}</strong> · {numBR(f.valor)}/{faixa(f)}</span>
              <span className="absolute bottom-0 left-0 h-0.5 bg-info" style={{ width: `${pct}%` }} aria-hidden />
            </button>
          );
        })}
      </div>

      {atual ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-card p-2.5">
          <p className="text-[12px]"><strong>{atual.label}</strong>: {numBR(atual.valor)} de {faixa(atual)} séries por semana. Falta{atual.falta === 1 ? "" : "m"} <strong>{numBR(atual.falta)}</strong>.</p>
          {opcoesTreino.length ? (
            <>
              <p className="text-[11px] font-semibold text-fg-muted">Em qual treino?</p>
              <div className="flex flex-wrap gap-1.5">
                {opcoesTreino.map((t, i) => (
                  <button key={t.key} type="button" onClick={() => setTreinoEscolhido(t.key)} aria-pressed={alvoKey === t.key} className={`rounded-lg border px-2 py-1 text-left text-[11px] ${alvoKey === t.key ? "border-accent bg-accent/10 text-fg" : "border-border text-fg-muted"}`}>
                    <span className="font-black text-accent">{t.letra}</span> {t.nome}
                    {i === 0 && t.motivo ? <span className="block text-[10px] text-success">👍 sugerido · {t.motivo}</span> : t.motivo ? <span className="block text-[10px] text-fg-subtle">{t.motivo}</span> : null}
                  </button>
                ))}
              </div>
              <p className="pt-1 text-[11px] font-semibold text-fg-muted">Escolha o exercício (entra com {series} séries de 10–12; dá para ajustar):</p>
              {sugeridos.length ? (
                <ul className="divide-y divide-border">
                  {sugeridos.map((it) => (
                    <li key={it.id} className="flex items-center gap-2 py-1.5">
                      <VerExercicio nome={it.nome} midia={it.midia?.verificada ? it.midia : null} passos={it.execucao.slice(0, 3)} tamanho="sm" />
                      <span className="min-w-0 flex-1 text-[12px]">
                        {it.nome}
                        {favoritos.has(it.id) ? <span className="ml-1 text-accent">★</span> : null}
                        {alvoKey && idsNoTreino(alvoKey).has(it.id) ? <span className="block text-[10px] text-fg-subtle">já está neste treino</span> : null}
                      </span>
                      <button type="button" onClick={() => alvoKey && onAdicionar(alvoKey, it, series)} className="shrink-0 rounded-md border border-accent/60 px-2 py-1 text-[11px] font-bold text-accent hover:bg-accent/10" aria-label={`Pôr ${it.nome} no treino`}>＋ {series} séries</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-fg-subtle">Nenhum exercício da biblioteca para este músculo.</p>
              )}
              {!mostrarTodos && sugeridos.length >= 6 ? <button type="button" onClick={() => setMostrarTodos(true)} className="text-[11px] font-semibold text-accent">Ver mais exercícios</button> : null}
            </>
          ) : (
            <p className="text-[11px] text-fg-subtle">Nenhum treino ativo para encaixar.</p>
          )}
        </div>
      ) : null}

      {acima.length ? <p className="mt-2 text-[11px] text-fg-muted">⚠️ Passaram da faixa: {acima.map((a) => `${a.label} +${numBR(a.passou)}`).join(" · ")}</p> : null}
    </section>
  );
}
