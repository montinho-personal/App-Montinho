"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input, Label } from "@/components/ui/Input";
import { GRUPO_LABEL } from "@/lib/grupos";
import { filtrarExercicios, filtrosComItens } from "@/lib/visitante/busca-exercicios";
import type { TreinoLido } from "@/lib/visitante/importar-treino";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { VerExercicio, type MidiaExercicio } from "@/components/ui/VerExercicio";
import { SubirTreino } from "./SubirTreino";

export type ItemLeve = { id: string; nome: string; grupo: GrupoMuscular; sinonimos: string[]; equipamento: string[]; video: boolean; midia: MidiaExercicio; passos: string[] };

/** Exercício do treino: da biblioteca (biblioteca_id) ou com o nome da pessoa (nome_livre). */
export type ExercicioInicial = { id: string | null; biblioteca_id: string | null; nome_livre: string | null; series: number; reps: string; descanso_seg: number; carga_kg: number | null };
export type TreinoInicial = { id: string | null; nome: string; exercicios: ExercicioInicial[] };

type Linha = ExercicioInicial & { chave: string; /** Como estava escrito na ficha (quando veio da leitura). */ escrito: string | null };

const DESCANSOS = [45, 60, 90, 120, 180];
const fmtDescanso = (s: number) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s / 60} min`);
const repsValidas = (r: string) => /^\d{1,3}(-\d{1,3})?$/.test(r.trim());

let seq = 0;
const novaChave = () => `l${++seq}`;

/** Treino lido → linhas do montador (mantém o nome da pessoa quando não achou na biblioteca). */
function linhasDoLido(t: TreinoLido): Linha[] {
  return t.exercicios.map((e) => ({
    chave: novaChave(),
    id: null,
    biblioteca_id: e.bibliotecaId,
    nome_livre: e.bibliotecaId ? null : e.nome,
    series: e.series,
    reps: e.reps,
    descanso_seg: e.descansoSeg ?? 90,
    carga_kg: e.cargaKg,
    escrito: e.confianca === "certeza" ? null : e.nome,
  }));
}

const corpoDoTreino = (id: string | null, nome: string, linhas: Linha[]) => ({
  id,
  nome: nome.trim(),
  exercicios: linhas.map((l) => ({ id: l.id, biblioteca_id: l.biblioteca_id, nome_livre: l.biblioteca_id ? null : (l.nome_livre ?? "").trim(), series: l.series, reps: l.reps.trim(), descanso_seg: l.descanso_seg, carga_kg: l.carga_kg })),
});

async function salvarNoServidor(corpo: ReturnType<typeof corpoDoTreino>): Promise<string | null> {
  const r = await fetch("/api/visitante/treinos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
  if (r?.ok) return null;
  const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
  return j?.error ?? "Não foi possível salvar agora.";
}

export function MontadorVisitante({ itens, inicial, iniciante, copia = false, demo = false }: { itens: ItemLeve[]; inicial: TreinoInicial | null; iniciante: boolean; copia?: boolean; demo?: boolean }) {
  const porId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [linhas, setLinhas] = useState<Linha[]>(() => (inicial?.exercicios ?? []).map((e) => ({ ...e, chave: novaChave(), escrito: null })));
  const [buscando, setBuscando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Leitura com vários treinos: confirma e salva todos de uma vez.
  const [varios, setVarios] = useState<TreinoLido[] | null>(null);
  const editando = Boolean(inicial?.id);
  const mostrarSubir = !editando && !copia && linhas.length === 0 && !varios;

  const resultados = useMemo(() => filtrarExercicios(itens, busca, filtro), [itens, busca, filtro]);
  const filtros = useMemo(() => filtrosComItens(itens), [itens]);
  const padraoReps = iniciante ? "10-12" : "8-12";

  function adicionar(item: ItemLeve) {
    setLinhas((l) => [...l, { chave: novaChave(), id: null, biblioteca_id: item.id, nome_livre: null, series: 3, reps: padraoReps, descanso_seg: 90, carga_kg: null, escrito: null }]);
    fecharBusca();
  }
  function adicionarComMeuNome() {
    setLinhas((l) => [...l, { chave: novaChave(), id: null, biblioteca_id: null, nome_livre: busca.trim().slice(0, 60), series: 3, reps: padraoReps, descanso_seg: 90, carga_kg: null, escrito: null }]);
    fecharBusca();
  }
  function fecharBusca() {
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

  function aoLer(treinos: TreinoLido[]) {
    setErro(null);
    if (treinos.length === 1) {
      setNome((n) => n || (treinos[0].nome === "Meu treino" ? "" : treinos[0].nome));
      setLinhas(linhasDoLido(treinos[0]));
    } else setVarios(treinos);
  }

  function problemas(ls: Linha[], n: string): string | null {
    if (n.trim().length < 2) return "Dê um nome ao treino (ex.: Peito e tríceps).";
    if (!ls.length) return "Adicione pelo menos um exercício.";
    if (ls.some((l) => !l.biblioteca_id && (l.nome_livre ?? "").trim().length < 2)) return "Dê um nome a cada exercício (do jeito que você vai lembrar).";
    if (ls.some((l) => !repsValidas(l.reps))) return "Repetições: use um número (10) ou uma faixa (8-12).";
    return null;
  }

  async function salvar() {
    setErro(null);
    const p = problemas(linhas, nome);
    if (p) return setErro(p);
    setEnviando(true);
    const falha = await salvarNoServidor(corpoDoTreino(inicial?.id ?? null, nome, linhas));
    if (falha) {
      setEnviando(false);
      return setErro(falha);
    }
    window.location.href = "/aluno/meus-treinos";
  }

  async function salvarTodos() {
    if (!varios) return;
    setErro(null);
    setEnviando(true);
    for (const [i, t] of varios.entries()) {
      const ls = linhasDoLido(t);
      const n = t.nome === "Meu treino" ? `Treino ${i + 1}` : t.nome;
      const falha = problemas(ls, n) ?? (await salvarNoServidor(corpoDoTreino(null, n, ls)));
      if (falha) {
        setEnviando(false);
        return setErro(`${n}: ${falha}${i > 0 ? ` (os ${i} primeiros já foram salvos)` : ""}`);
      }
    }
    window.location.href = "/aluno/meus-treinos";
  }

  const totalSeries = linhas.reduce((n, l) => n + l.series, 0);
  const botao = "alvo grid h-11 w-11 place-items-center rounded-lg border border-border text-fg-muted disabled:opacity-30";

  if (varios) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold">Encontrei {varios.length} treinos</h1>
          <p className="mt-1 text-sm text-fg-muted">Confira a lista. Depois de salvar, dá para editar cada um em Meus treinos.</p>
        </header>
        <ul className="space-y-3">
          {varios.map((t, i) => (
            <li key={i} className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold">{t.nome === "Meu treino" ? `Treino ${i + 1}` : t.nome}</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {t.exercicios.map((e, k) => {
                  const item = e.bibliotecaId ? porId.get(e.bibliotecaId) : null;
                  return (
                    <li key={k} className="flex justify-between gap-2">
                      <span className="min-w-0">{item ? item.nome : e.nome}{item ? null : <span className="ml-1 text-[11px] text-fg-subtle">(nome seu)</span>}</span>
                      <span className="shrink-0 font-mono text-xs text-fg-muted">{e.series}×{e.reps}{e.cargaKg ? ` · ${String(e.cargaKg).replace(".", ",")} kg` : ""}</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
        <Button type="button" className="w-full" disabled={enviando} onClick={() => void salvarTodos()}>{enviando ? "Salvando…" : `Salvar os ${varios.length} treinos`}</Button>
        <Button type="button" variant="ghost" className="w-full" disabled={enviando} onClick={() => { setNome(varios[0].nome === "Meu treino" ? "" : varios[0].nome); setLinhas(linhasDoLido(varios[0])); setVarios(null); }}>
          Editar só o primeiro agora
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">{editando ? "Editar treino" : copia ? "Copiar treino" : "Montar treino"}</h1>
        <p className="mt-1 text-sm text-fg-muted">{copia ? "É uma cópia: troque o nome e os exercícios que quiser e salve como um treino novo." : "Escolha os exercícios e ajuste séries, repetições e descanso."}</p>
      </header>

      {mostrarSubir ? (
        <a href="/aluno/monte-com-ia" className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:border-accent/60">
          <span className="text-2xl" aria-hidden>✨</span>
          <span><span className="block text-sm font-semibold">Prefere que o app monte para você?</span><span className="block text-xs text-fg-muted">Monte com IA: diga dias, tempo e foco e receba duas opções.</span></span>
        </a>
      ) : null}
      {mostrarSubir ? <SubirTreino itens={itens} onLido={aoLer} demo={demo} /> : null}

      <div>
        <Label htmlFor="nome-treino">Nome do treino</Label>
        <Input id="nome-treino" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Peito e tríceps" maxLength={60} />
      </div>

      {linhas.length ? (
        <ol className="space-y-3">
          {linhas.map((l, i) => {
            const item = l.biblioteca_id ? porId.get(l.biblioteca_id) : null;
            return (
              <li key={l.chave} className="space-y-3 rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-sm font-bold text-accent">{i + 1}.</span>
                  {item ? <VerExercicio nome={item.nome} midia={item.midia} passos={item.passos} tamanho="sm" /> : null}
                  <div className="min-w-0 flex-1">
                    {item ? (
                      <>
                        <p className="font-semibold leading-tight">{item.nome}</p>
                        <p className="text-xs text-fg-subtle">{GRUPO_LABEL[item.grupo]}</p>
                        {l.escrito ? (
                          <p className="mt-1 text-[11px] text-fg-muted">
                            Na sua ficha: “{l.escrito}”. Não é esse?{" "}
                            <button type="button" className="font-semibold text-accent underline-offset-2 hover:underline" onClick={() => alterar(l.chave, { biblioteca_id: null, nome_livre: l.escrito, escrito: null })}>Usar o meu nome</button>
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <label className="sr-only" htmlFor={`nome-${l.chave}`}>Nome do exercício</label>
                        <Input id={`nome-${l.chave}`} value={l.nome_livre ?? ""} onChange={(e) => alterar(l.chave, { nome_livre: e.target.value.slice(0, 60) })} placeholder="Nome que você vai lembrar (ex.: aquele de puxar)" />
                        <p className="mt-1 text-[11px] text-fg-subtle">📝 Com o seu nome: fica salvo para acompanhar sua evolução de carga e repetições. Só não entra na conta de volume por músculo.</p>
                      </>
                    )}
                  </div>
                  <button type="button" className={botao} onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">
                    <Icon name="up" size={16} />
                  </button>
                  <button type="button" className={botao} onClick={() => mover(i, 1)} disabled={i === linhas.length - 1} aria-label="Descer">
                    <Icon name="down" size={16} />
                  </button>
                  <button type="button" className={botao} onClick={() => setLinhas((x) => x.filter((y) => y.chave !== l.chave))} aria-label={`Tirar ${item?.nome ?? l.nome_livre ?? "exercício"}`}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                      {[...new Set([...DESCANSOS, l.descanso_seg])].sort((a, b) => a - b).map((d) => (
                        <option key={d} value={d}>{fmtDescanso(d)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-fg-muted" htmlFor={`carga-${l.chave}`}>Carga (kg)</label>
                    <Input
                      id={`carga-${l.chave}`}
                      inputMode="decimal"
                      placeholder="opcional"
                      className="text-center"
                      value={l.carga_kg == null ? "" : String(l.carga_kg).replace(".", ",")}
                      onChange={(e) => {
                        const t = e.target.value.replace(",", ".").replace(/[^\d.]/g, "").slice(0, 6);
                        const n = Number(t);
                        alterar(l.chave, { carga_kg: t && Number.isFinite(n) && n <= 500 ? n : null });
                      }}
                    />
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
            <button type="button" className={botao} onClick={fecharBusca} aria-label="Fechar busca">
              <Icon name="x" size={16} />
            </button>
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
              <li key={r.id} className="flex items-center gap-3 py-1.5">
                {/* Toque na miniatura: vê o vídeo (não adiciona). Toque no nome: adiciona. */}
                <VerExercicio nome={r.nome} midia={r.midia} passos={r.passos} />
                <button type="button" onClick={() => adicionar(r)} className="alvo flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{r.nome}</span>
                    <span className="block text-xs text-fg-subtle">{GRUPO_LABEL[r.grupo]}{r.video ? " · toque na imagem para ver o vídeo" : ""}</span>
                  </span>
                  <Icon name="plus" size={18} className="shrink-0 text-accent" />
                </button>
              </li>
            ))}
            {resultados.length === 0 ? <li className="py-3 text-center text-sm text-fg-muted">Nada encontrado com esse nome.</li> : null}
          </ul>
          <button type="button" onClick={adicionarComMeuNome} className="alvo flex w-full items-start gap-3 rounded-xl border border-dashed border-accent/60 px-3 py-3 text-left">
            <Icon name="plus" size={18} className="mt-0.5 shrink-0 text-accent" />
            <span>
              <span className="block text-sm font-semibold text-accent">{busca.trim() ? `Cadastrar “${busca.trim().slice(0, 40)}” com esse nome` : "Cadastrar com o nome que você quiser"}</span>
              <span className="block text-xs text-fg-muted">Não sabe o nome certo? Use o nome que você vai lembrar. Fica salvo para acompanhar sua evolução.</span>
            </span>
          </button>
        </section>
      ) : linhas.length < 15 ? (
        <button type="button" onClick={() => setBuscando(true)} className="alvo flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-accent/60 text-sm font-semibold text-accent">
          <Icon name="plus" size={18} /> {linhas.length || !mostrarSubir ? "Adicionar exercício" : "Ou monte pela biblioteca de exercícios"}
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
