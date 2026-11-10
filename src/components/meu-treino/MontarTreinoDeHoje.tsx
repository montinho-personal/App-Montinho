"use client";

// “✏️ Montar o de hoje” (10/11/2026, pedido do Montinho: “quero montar apenas
// 1 treino, para um dia, e não um protocolo”): escolhe os exercícios da
// biblioteca com séries × reps e começa o treino livre já com essa meta.
// Nada vai para a ficha (vale só para hoje).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { EscolherExercicio, type ItemBusca } from "@/components/livre/EscolherExercicio";
import { EscolherTecnica, type EscolhaTecnica } from "@/components/livre/EscolherTecnica";
import { juntaExercicios } from "@/lib/treino/tecnica-aluno";
import type { ConfigTecnica } from "@/lib/treino/tecnica-config";
import { infoTecnica } from "@/lib/treino/tecnica-aluno";
import { registraEmBlocos } from "@/lib/treino/tecnica-config";

/** Técnica feita em séries próprias (drop-set, rest-pause, myo-reps, cluster, 3/7): conta à parte das normais. */
const emBlocos = (l: { tecnica: string; config: unknown; junto: boolean }) => !l.junto && !!l.config && registraEmBlocos(infoTecnica(l.tecnica)?.serie ?? null);

type Linha = { id: string; nome: string; /** Séries normais. */ series: number; /** Séries com a técnica (feitas DEPOIS das normais). */ tecSeries: number; reps: string; tecnica: string; /** Como a técnica é feita (o mesmo quadro do “＋ Técnica” do treino livre). */ config: ConfigTecnica | null; /** Bi-set/tri-set: junto com o próximo da lista. */ junto: boolean };
const REPS = ["6-8", "8-10", "10-12", "12-15", "15-20"];
const novaChave = () => `hoje-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function MontarTreinoDeHoje({ itens }: { itens: ItemBusca[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tecnicaDe, setTecnicaDe] = useState<number | null>(null);
  /** Bi-set escolhido com exercício novo: o próximo da busca entra logo depois deste. */
  const [inserirApos, setInserirApos] = useState<number | null>(null);

  function aplicar(i: number, esc: EscolhaTecnica) {
    setTecnicaDe(null);
    if (!juntaExercicios(esc.tecnica)) return mudar(i, { tecnica: esc.tecnica, config: esc.config, junto: false });
    // Bi-set/tri-set: os parceiros escolhidos vão logo depois deste, todos “junto com o próximo”.
    setLinhas((ls) => {
      const ids = esc.parceiros.map(Number);
      const atual = { ...ls[i], tecnica: "normal", config: null, junto: true };
      const parceiros = ids.map((k) => ({ ...ls[k], tecnica: "normal", config: null, junto: true }));
      const antes = ls.filter((_, k) => k < i && !ids.includes(k));
      const depois = ls.filter((_, k) => k > i && !ids.includes(k));
      const bloco = [atual, ...parceiros];
      if (esc.novos === 0) bloco[bloco.length - 1] = { ...bloco[bloco.length - 1], junto: false };
      return [...antes, ...bloco, ...depois];
    });
    if (esc.novos > 0) {
      setInserirApos(linhas.filter((_, k) => k < i && !esc.parceiros.map(Number).includes(k)).length + esc.parceiros.length);
      setBuscando(true);
    }
  }
  const mudar = (i: number, p: Partial<Linha>) => setLinhas((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const mover = (i: number, d: -1 | 1) => setLinhas((ls) => { const j = i + d; if (j < 0 || j >= ls.length) return ls; const c = [...ls]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  async function comecar() {
    setEnviando(true);
    setErro(null);
    const corpo = { client_key: novaChave(), montado: { titulo: titulo.trim() || "Treino de hoje", itens: linhas.map((l, i) => { const junto = l.junto && i < linhas.length - 1; const blocos = !junto && emBlocos(l); return { biblioteca_id: l.id, series: Math.min(10, l.series + (blocos ? l.tecSeries : 0)), reps: l.reps, ...(junto ? { junto_com_proximo: true } : l.tecnica !== "normal" ? { tecnica: l.tecnica, tecnica_config: (blocos && l.config ? { ...l.config, aplicar: "principais", series: l.tecSeries } : l.config) as Record<string, unknown> | null } : {}) }; }) } };
    const r = await fetch("/api/meu-treino/comecar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!r?.ok || !j.id) {
      setEnviando(false);
      return setErro(j.error ?? "Não deu para começar agora.");
    }
    router.push(`/aluno/livre/${j.id}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">Monte um treino só para hoje: escolha os exercícios, as séries e as repetições. Não muda nenhuma ficha. Fazendo todas as séries, vale a Missão Cumprida.</p>
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 60))} placeholder="Nome do treino (opcional) · ex.: Peito e tríceps" aria-label="Nome do treino" />
      {linhas.length ? (
        <ol className="space-y-2">
          {linhas.map((l, i) => (
            <li key={`${l.id}-${i}`} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <span className="w-5 text-sm font-bold text-fg-subtle">{i + 1}.</span>
                <span className="min-w-0 flex-1 text-sm font-semibold">{l.nome}</span>
                <button type="button" aria-label="Subir" onClick={() => mover(i, -1)} className="px-1 text-fg-muted">▲</button>
                <button type="button" aria-label="Descer" onClick={() => mover(i, 1)} className="px-1 text-fg-muted">▼</button>
                <button type="button" aria-label={`Tirar ${l.nome}`} onClick={() => setLinhas((ls) => ls.filter((_, k) => k !== i))} className="px-1 text-red">✕</button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-7 text-sm">
                <span className="text-xs text-fg-muted">{emBlocos(l) ? "Séries normais" : "Séries"}</span>
                <button type="button" aria-label="Menos uma série" onClick={() => mudar(i, { series: Math.max(1, l.series - 1) })} className="h-8 w-8 rounded-full border border-border">−</button>
                <span className="w-5 text-center font-bold tabular-nums">{l.series}</span>
                <button type="button" aria-label="Mais uma série" onClick={() => mudar(i, { series: Math.min(10, l.series + 1) })} className="h-8 w-8 rounded-full border border-border">+</button>
                <span className="ml-2 text-xs text-fg-muted">Reps</span>
                <div className="flex flex-wrap gap-1">
                  {REPS.map((r) => (
                    <button key={r} type="button" aria-pressed={l.reps === r} onClick={() => mudar(i, { reps: r })} className={`h-8 rounded-full border px-2 text-xs font-semibold ${l.reps === r ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>{r.replace("-", "–")}</button>
                  ))}
                </div>
              </div>
              <div className="mt-2 space-y-1.5 pl-7">
                {l.junto && i < linhas.length - 1 ? (
                  <p className="text-xs font-semibold text-accent">⚡ Bi-set com o próximo: um atrás do outro, sem descanso no meio.</p>
                ) : (
                  <button type="button" onClick={() => setTecnicaDe(i)} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs ${l.tecnica !== "normal" ? "border-accent/60 bg-accent/10" : "border-border"}`}>
                    <span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Técnica</span><span className="block font-semibold">{l.tecnica !== "normal" ? (infoTecnica(l.tecnica)?.nome ?? l.tecnica) : "Sem técnica · séries normais"}</span></span>
                    <span className="shrink-0 rounded-full border border-accent px-2.5 py-1 font-bold text-accent">{l.tecnica !== "normal" ? "Mudar" : "＋ Técnica / bi-set"}</span>
                  </button>
                )}
                {emBlocos(l) ? (
                  <div className="space-y-1 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-xs text-fg-muted">Séries de {infoTecnica(l.tecnica)?.nome}</span>
                      <button type="button" aria-label="Menos uma série com a técnica" onClick={() => mudar(i, { tecSeries: Math.max(1, l.tecSeries - 1) })} className="h-8 w-8 rounded-full border border-border">−</button>
                      <span className="w-5 text-center font-bold tabular-nums">{l.tecSeries}</span>
                      <button type="button" aria-label="Mais uma série com a técnica" onClick={() => mudar(i, { tecSeries: Math.min(6, l.tecSeries + 1) })} className="h-8 w-8 rounded-full border border-border">+</button>
                    </div>
                    <p className="text-xs font-semibold">= {l.series + l.tecSeries} séries: {l.series} {l.series === 1 ? "normal" : "normais"} e, no fim, {l.tecSeries} de {infoTecnica(l.tecnica)?.nome}.</p>
                  </div>
                ) : !l.junto && l.tecnica !== "normal" ? (
                  <p className="text-xs font-semibold">= {l.series} {l.series === 1 ? "série" : "séries"}, todas com {infoTecnica(l.tecnica)?.nome}.</p>
                ) : null}
                {i < linhas.length - 1 ? (
                  <button type="button" aria-pressed={l.junto} onClick={() => mudar(i, { junto: !l.junto })} className={`h-7 rounded-full border px-2 text-[11px] font-semibold ${l.junto ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>{l.junto ? "✓ Junto com o próximo (separar)" : "⚡ Juntar em bi-set com o próximo"}</button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {buscando ? (
        <EscolherExercicio itens={itens} onEscolher={(it) => { const nova: Linha = { id: it.id, nome: it.nome, series: 3, tecSeries: 1, reps: "10-12", tecnica: "normal", config: null, junto: false }; setLinhas((ls) => (inserirApos != null ? [...ls.slice(0, inserirApos + 1), nova, ...ls.slice(inserirApos + 1)] : [...ls, nova]).slice(0, 15)); setInserirApos(null); setBuscando(false); }} onFechar={() => { setBuscando(false); setInserirApos(null); }} />
      ) : (
        <button type="button" disabled={linhas.length >= 15} onClick={() => setBuscando(true)} className="touch w-full rounded-xl border border-dashed border-accent px-3 py-3 text-sm font-bold text-accent disabled:opacity-50">＋ {linhas.length ? "Pôr mais um exercício" : "Escolher o primeiro exercício"}</button>
      )}
      {tecnicaDe != null && linhas[tecnicaDe] ? (
        <EscolherTecnica nome={linhas[tecnicaDe].nome} atual={linhas[tecnicaDe].tecnica} configAtual={linhas[tecnicaDe].config} outros={linhas.map((l, k) => ({ seId: String(k), nome: l.nome })).filter((o) => o.seId !== String(tecnicaDe) && !linhas[Number(o.seId)].junto)} onEscolher={(esc) => aplicar(tecnicaDe, esc)} onFechar={() => setTecnicaDe(null)} semComoUsar />
      ) : null}
      {erro ? <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">{erro}</p> : null}
      {linhas.length ? (
        <button type="button" disabled={enviando} onClick={() => void comecar()} className="touch w-full rounded-xl bg-accent px-3 py-3 font-black text-bg disabled:opacity-60">{enviando ? "Abrindo…" : `▶ Começar este treino (${linhas.length} exercício${linhas.length === 1 ? "" : "s"})`}</button>
      ) : null}
    </div>
  );
}
