"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Label } from "@/components/ui/Input";
import { GRUPO_LABEL } from "@/lib/grupos";
import { filtrarExercicios, filtrosComItens } from "@/lib/visitante/busca-exercicios";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type ItemLeve = { id: string; nome: string; grupo: GrupoMuscular; sinonimos: string[]; equipamento: string[]; video: boolean };

type Linha = { chave: string; id: string | null; biblioteca_id: string; series: number; reps: string; descanso_seg: number };

const DESCANSOS = [45, 60, 90, 120, 180];
const fmtDescanso = (s: number) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);

let seq = 0;
const novaChave = () => `l${++seq}`;

export function MontadorVisitante({ itens, inicial, iniciante }: { itens: ItemLeve[]; inicial: { id: string; nome: string; exercicios: Array<{ id: string; biblioteca_id: string; series: number; reps: string; descanso_seg: number }> } | null; iniciante: boolean }) {
  const porId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() => (inicial?.exercicios ?? []).map((e) => ({ ...e, chave: novaChave() })));
  const [buscando, setBuscando] = useState(!inicial);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const resultados = useMemo(() => {
    return filtrarExercicios(itens, busca, filtro);
  }, [itens, busca, filtro]);
  const filtros = useMemo(() => filtrosComItens(itens), [itens]);

  function adicionar(item: ItemLeve) {
    setLinhas((l) => [...l, { chave: novaChave(), id: null, biblioteca_id: item.id, series: 3, reps: iniciante ? "10-12" : "8-12", descanso_seg: 90 }]);
    setBuscando(false);
    setBusca("");
    setFiltro(null);
  }
  const alterar = (chave: string, patch: Partial<Linha>) => setLinhas((l) => l.map((x) => (x.chave === chave ? { ...x, ...patch } : x)));
  const mover = (i: number, d: -1 | 1) =>
    setLinhas((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const c = l.slice();
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  async function salvar() {
    setErro(null);
    if (nome.trim().length < 2) return setErro("Dê um nome ao treino (ex.: Peito e tríceps).");
    if (!linhas.length) return setErro("Adicione pelo menos um exercício.");
    if (linhas.some((l) => !/^\d{1,3}(-\d{1,3})?$/.test(l.reps.trim()))) return setErro("Repetições: use um número (10) ou uma faixa (8-12).");
    setEnviando(true);
    const r = await fetch("/api/visitante/treinos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inicial?.id ?? null, nome: nome.trim(), exercicios: linhas.map((l) => ({ id: l.id, biblioteca_id: l.biblioteca_id, series: l.series, reps: l.reps.trim(), descanso_seg: l.descanso_seg })) }),
    }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!r?.ok) {
      setEnviando(false);
      return setErro(j?.error ?? "Não foi possível salvar agora.");
    }
    window.location.href = "/aluno/meus-treinos";
  }

  const totalSeries = linhas.reduce((n, l) => n + l.series, 0);
  const botao = "alvo grid h-11 w-11 place-items-center rounded-lg border border-border text-fg-muted disabled:opacity-30";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{inicial ? "Editar treino" : "Montar treino"}</h1>
        <p className="text-sm text-fg-muted mt-1">Escolha os exercícios e ajuste séries, repetições e descanso.</p>
      </header>

      <div>
        <Label htmlFor="nome-treino">Nome do treino</Label>
        <Input id="nome-treino" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Peito e tríceps" maxLength={60} />
      </div>

      {linhas.length ? (
        <ol className="space-y-3">
          {linhas.map((l, i) => {
            const item = porId.get(l.biblioteca_id);
            return (
              <li key={l.chave} className="rounded-xl border border-border bg-card p-3 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-sm font-bold text-accent">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{item?.nome ?? "Exercício"}</p>
                    <p className="text-xs text-fg-subtle">{item ? GRUPO_LABEL[item.grupo] : ""}{item?.video ? " · com vídeo" : ""}</p>
                  </div>
                  <button type="button" className={botao} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                    <Icon name="up" size={16} />
                  </button>
                  <button type="button" className={botao} onClick={() => mover(i, 1)} disabled={i === linhas.length - 1} aria-label="Descer">
                    <Icon name="down" size={16} />
                  </button>
                  <button type="button" className={botao} onClick={() => setLinhas((x) => x.filter((y) => y.chave !== l.chave))} aria-label={`Tirar ${item?.nome ?? "exercício"}`}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="mb-1 text-xs text-fg-muted">Séries</p>
                    <div className="flex items-center rounded-lg border border-border">
                      <button type="button" className="alvo h-11 w-9 text-lg" onClick={() => alterar(l.chave, { series: Math.max(1, l.series - 1) })} aria-label="Menos uma série">−</button>
                      <span className="flex-1 text-center font-semibold">{l.series}</span>
                      <button type="button" className="alvo h-11 w-9 text-lg" onClick={() => alterar(l.chave, { series: Math.min(10, l.series + 1) })} aria-label="Mais uma série">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fg-muted" htmlFor={`reps-${l.chave}`}>Repetições</label>
                    <Input id={`reps-${l.chave}`} value={l.reps} onChange={(e) => alterar(l.chave, { reps: e.target.value.replace(/[^\d-]/g, "").slice(0, 7) })} inputMode="numeric" className="text-center" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fg-muted" htmlFor={`desc-${l.chave}`}>Descanso</label>
                    <select id={`desc-${l.chave}`} value={l.descanso_seg} onChange={(e) => alterar(l.chave, { descanso_seg: Number(e.target.value) })} className="h-11 w-full rounded-lg border border-border bg-bg px-2 text-sm text-fg">
                      {DESCANSOS.map((d) => (
                        <option key={d} value={d}>{fmtDescanso(d)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {buscando ? (
        <section className="space-y-3 rounded-xl border border-accent/40 p-3" aria-label="Escolher exercício">
          <div className="flex items-center gap-2">
            <Input value={busca} onChange={(e) => { setBusca(e.target.value); setFiltro(null); }} placeholder="Buscar: supino, adutora, agachamento…" aria-label="Buscar exercício" autoFocus />
            {linhas.length ? (
              <button type="button" className={botao} onClick={() => setBuscando(false)} aria-label="Fechar busca">
                <Icon name="x" size={16} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {filtros.map((f) => (
              <button key={f.valor} type="button" onClick={() => { setFiltro(filtro === f.valor ? null : f.valor); setBusca(""); }} aria-pressed={filtro === f.valor} className={`min-h-9 rounded-full border px-3 text-xs ${filtro === f.valor ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted"}`}>
                {f.rotulo}
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-subtle" aria-live="polite">
            {resultados.length} {resultados.length === 1 ? "exercício" : "exercícios"}
            {resultados.length > 8 ? " · role a lista para ver todos" : ""}
          </p>
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {resultados.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => adicionar(r)} className="alvo flex w-full items-center gap-3 py-2.5 text-left">
                  <Icon name="plus" size={16} className="text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{r.nome}</span>
                    <span className="block text-xs text-fg-subtle">{GRUPO_LABEL[r.grupo]}{r.video ? " · com vídeo" : ""}</span>
                  </span>
                </button>
              </li>
            ))}
            {resultados.length === 0 ? <li className="py-4 text-center text-sm text-fg-muted">Nada encontrado. Tente outra palavra.</li> : null}
          </ul>
        </section>
      ) : linhas.length < 15 ? (
        <button type="button" onClick={() => setBuscando(true)} className="alvo flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/60 text-sm font-semibold text-accent">
          <Icon name="plus" size={18} /> Adicionar exercício
        </button>
      ) : null}

      {linhas.length ? <p className="text-center text-xs text-fg-subtle">{linhas.length} exercícios · {totalSeries} séries</p> : null}
      {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
      <Button type="button" className="w-full" disabled={enviando} onClick={() => void salvar()}>
        {enviando ? "Salvando…" : "Salvar treino"}
      </Button>
    </div>
  );
}
