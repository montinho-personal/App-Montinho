"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SorteioMontinho } from "@/components/desafios/SorteioMontinho";
import { DESAFIOS_PRONTOS, DURACOES_DESAFIO, FOCOS, TIPOS_DESAFIO, type DesafioPronto, type ExercicioDesafio, type FocoMuscular, type TipoDesafio } from "@/lib/desafios/regras";

// “Quem mais evolui” aparece como uma opção dentro de “Quem pega mais peso” (o criador escolhe).
const TIPOS = (Object.keys(TIPOS_DESAFIO) as TipoDesafio[]).filter((t) => t !== "evolucao");
const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type InicialDesafio = {
  convidar?: string[];
  busca?: string;
  /** Revanche: mesma regra e mesmas pessoas do desafio anterior. */
  revanche?: { id: string; nome: string; tipo: TipoDesafio; meta: number | null; dias: number; foco: FocoMuscular | null; exercicios: ExercicioDesafio[] | null };
};

export function NovoDesafioClient({ hoje, maximo, primeiroNome, pessoas, biblioteca, inicial = {} }: { hoje: string; maximo: string; primeiroNome: string; pessoas: Array<{ alunoId: string; nome: string }>; biblioteca: Array<{ id: string; nome: string }>; inicial?: InicialDesafio }) {
  const router = useRouter();
  const rv = inicial.revanche;
  const [modelo, setModelo] = useState<string | null>(null);
  const [nome, setNome] = useState(rv ? `Revanche: ${rv.nome}`.slice(0, 60) : `Desafio de ${primeiroNome}`);
  const [tipo, setTipo] = useState<TipoDesafio>(rv?.tipo ?? "mais_treinos");
  const [meta, setMeta] = useState<number>(rv?.meta ?? 12);
  const [dias, setDias] = useState<number>(rv?.dias ?? 7);
  const [foco, setFoco] = useState<FocoMuscular>(rv?.foco ?? "pernas");
  const [exercicios, setExercicios] = useState<ExercicioDesafio[]>(rv?.exercicios ?? []);
  const [buscaEx, setBuscaEx] = useState("");
  const [inicio, setInicio] = useState(hoje);
  const [convidar, setConvidar] = useState<string[]>(inicial.convidar ?? []);
  const [busca, setBusca] = useState(inicial.busca ?? "");
  const [montar, setMontar] = useState(!!rv);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const info = TIPOS_DESAFIO[tipo];
  const lista = pessoas.filter((p) => convidar.includes(p.alunoId) || !busca.trim() || sem(p.nome).includes(sem(busca.trim()))).slice(0, 30);
  const sugestoesEx = buscaEx.trim().length >= 2 ? biblioteca.filter((b) => sem(b.nome).includes(sem(buscaEx.trim())) && !exercicios.some((e) => e.id === b.id)).slice(0, 8) : [];
  const duracoes: number[] = dias === 28 ? [...DURACOES_DESAFIO, 28].sort((a, b) => a - b) : [...DURACOES_DESAFIO];

  function escolherTipo(t: TipoDesafio) {
    setTipo(t);
    setModelo(null);
    const m = TIPOS_DESAFIO[t].meta;
    if (m) setMeta(m.padrao);
  }
  function usarPronto(p: DesafioPronto) {
    setModelo(p.id);
    setTipo(p.tipo);
    setNome(p.nome);
    if (p.meta) setMeta(p.meta);
    setDias(p.dias);
    if (p.foco) setFoco(p.foco);
    setMontar(true);
    requestAnimationFrame(() => document.getElementById("form-desafio")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 3) return setErro("Dê um nome ao desafio.");
    if (tipo === "treino_desafio" && !exercicios.length) return setErro("Escolha pelo menos 1 exercício do treino do desafio.");
    setOcupado(true);
    const corpo = { nome: nome.trim(), tipo, meta: info.meta ? meta : null, inicio, dias, foco: tipo === "musculo" ? foco : null, exercicios: tipo === "treino_desafio" ? exercicios : null, modelo, revancheDe: rv?.id ?? null, convidar };
    const r = await fetch("/api/desafios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    const j = ((await r?.json().catch(() => ({}))) ?? {}) as { id?: string; error?: string };
    if (!r?.ok || !j.id) {
      setErro(j.error ?? "Sem conexão. Tente de novo.");
      setOcupado(false);
      return;
    }
    router.push(`/aluno/desafios/${j.id}?novo=1`);
  }

  return (
    <div className="space-y-6">
      {!rv ? (
        <section className="space-y-2" aria-label="Desafios prontos">
          <SorteioMontinho onAceitar={usarPronto} />
          <h2 className="pt-2 text-sm font-bold uppercase tracking-wider text-fg-muted">Ou escolha um pronto</h2>
          <div className="grid grid-cols-2 gap-2">
            {DESAFIOS_PRONTOS.map((p) => (
              <button key={p.id} type="button" aria-pressed={modelo === p.id} onClick={() => usarPronto(p)} className={`alvo flex flex-col items-start rounded-xl border p-3 text-left ${modelo === p.id ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                <span className="text-xl" aria-hidden>{p.emoji}</span>
                <span className="mt-1 text-sm font-bold leading-tight">{p.nome}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-fg-muted">{p.chamada}</span>
              </button>
            ))}
          </div>
          {!montar ? (
            <button type="button" onClick={() => setMontar(true)} className="alvo w-full rounded-xl border border-dashed border-accent/60 px-4 py-3 text-sm font-bold text-accent">
              ✏️ Montar o meu do zero
            </button>
          ) : null}
        </section>
      ) : null}

      {montar ? (
        <form id="form-desafio" onSubmit={criar} className="scroll-mt-20 space-y-5" noValidate>
          <div className="space-y-1">
            <label htmlFor="nome" className="text-sm font-semibold">Nome do desafio</label>
            <input id="nome" value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} className="w-full rounded-lg border border-border bg-bg px-3 py-2.5" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Regra</legend>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map((t) => {
                const x = TIPOS_DESAFIO[t];
                const on = t === tipo || (t === "volume" && tipo === "evolucao");
                return (
                  <button key={t} type="button" aria-pressed={on} onClick={() => escolherTipo(t)} className={`alvo flex flex-col items-start rounded-xl border px-3 py-2 text-left ${on ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                    <span className="text-sm font-bold">{x.emoji} {x.titulo}</span>
                  </button>
                );
              })}
            </div>
            <p className="rounded-lg bg-bg/60 px-3 py-2 text-xs text-fg-muted">{info.descricao}</p>
          </fieldset>
          {tipo === "volume" || tipo === "evolucao" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Como conta o peso?</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["volume", "🏋️‍♂️ Peso total", "Ganha quem levantar mais (carga × repetições)."],
                  ["evolucao", "📈 Evolução %", "Ganha quem mais melhorar em relação a si mesmo. Justo entre forte e iniciante."],
                ] as const).map(([t, titulo, texto]) => (
                  <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)} className={`alvo flex flex-col items-start rounded-xl border px-3 py-2 text-left ${tipo === t ? "border-accent bg-accent/10" : "border-border bg-card"}`}>
                    <span className="text-sm font-bold">{titulo}</span>
                    <span className="text-[11px] text-fg-muted">{texto}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {info.meta ? (
            <div className="space-y-1">
              <label htmlFor="meta" className="text-sm font-semibold">Meta</label>
              <div className="flex items-center gap-2">
                <input id="meta" type="number" inputMode="numeric" min={1} max={info.meta.max} value={meta} onChange={(e) => setMeta(Math.max(1, Math.min(info.meta!.max, Number(e.target.value) || 1)))} className="w-20 rounded-lg border border-border bg-bg px-3 py-2.5 text-center font-mono" />
                <span className="text-sm text-fg-muted">{info.meta.rotulo}</span>
              </div>
            </div>
          ) : null}
          {tipo === "musculo" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Músculo</legend>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(FOCOS) as FocoMuscular[]).map((f) => (
                  <button key={f} type="button" aria-pressed={foco === f} onClick={() => setFoco(f)} className={`alvo rounded-full border px-3 py-1.5 text-sm ${foco === f ? "border-accent bg-accent/15 font-semibold text-accent" : "border-border"}`}>
                    {FOCOS[f].rotulo}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          {tipo === "treino_desafio" ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Exercícios do treino do desafio (até 10)</legend>
              {exercicios.length ? (
                <ol className="space-y-1">
                  {exercicios.map((e, i) => (
                    <li key={e.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                      <span>{i + 1}. {e.nome}</span>
                      <button type="button" onClick={() => setExercicios((x) => x.filter((y) => y.id !== e.id))} aria-label={`Tirar ${e.nome}`} className="alvo text-fg-muted">✕</button>
                    </li>
                  ))}
                </ol>
              ) : null}
              {exercicios.length < 10 ? <input value={buscaEx} onChange={(e) => setBuscaEx(e.target.value)} placeholder="Buscar exercício (ex.: agachamento)" aria-label="Buscar exercício" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" /> : null}
              {sugestoesEx.length ? (
                <ul className="space-y-1">
                  {sugestoesEx.map((b) => (
                    <li key={b.id}>
                      <button type="button" onClick={() => { setExercicios((x) => [...x, { id: b.id, nome: b.nome }]); setBuscaEx(""); }} className="alvo flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-accent">
                        {b.nome} <span aria-hidden>+</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-fg-subtle">Vale o peso feito nesses exercícios no período, no treino de cada um ou num treino livre.</p>
            </fieldset>
          ) : null}
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Duração</legend>
            <div className="flex flex-wrap gap-2">
              {duracoes.map((d) => (
                <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)} className={`alvo flex-1 rounded-lg border px-3 py-2 text-sm font-semibold ${dias === d ? "border-accent bg-accent/10 text-accent" : "border-border"}`}>
                  {d === 1 ? "Só hoje" : `${d} dias`}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-1">
            <label htmlFor="inicio" className="text-sm font-semibold">Começa em</label>
            <input id="inicio" type="date" min={hoje} max={maximo} value={inicio} onChange={(e) => setInicio(e.target.value || hoje)} className="w-full rounded-lg border border-border bg-bg px-3 py-2.5" />
          </div>
          {pessoas.length ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Desafiar quem já treina no app</legend>
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" aria-label="Buscar pelo nome" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
              <div className="flex flex-wrap gap-2">
                {lista.map((p) => {
                  const on = convidar.includes(p.alunoId);
                  return (
                    <button key={p.alunoId} type="button" aria-pressed={on} onClick={() => setConvidar((c) => (on ? c.filter((x) => x !== p.alunoId) : [...c, p.alunoId]))} className={`alvo rounded-full border px-3 py-1.5 text-sm ${on ? "border-accent bg-accent/15 font-semibold text-accent" : "border-border"}`}>
                      {on ? "✓ " : ""}
                      {p.nome}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-fg-subtle">Depois de criar, você também manda o link pelo WhatsApp para quem quiser, até para quem ainda não usa o app.</p>
            </fieldset>
          ) : null}
          {erro ? <p role="alert" className="text-sm text-red">{erro}</p> : null}
          <button type="submit" disabled={ocupado} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg disabled:opacity-60">
            {ocupado ? "Criando…" : convidar.length ? `⚔️ Desafiar ${convidar.length === 1 ? (pessoas.find((p) => p.alunoId === convidar[0])?.nome ?? "") : `${convidar.length} pessoas`}` : "⚔️ Criar desafio"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
