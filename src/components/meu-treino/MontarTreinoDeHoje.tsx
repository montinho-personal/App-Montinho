"use client";

// “✏️ Montar o de hoje” (10/11/2026, pedido do Montinho: “quero montar apenas
// 1 treino, para um dia, e não um protocolo”): escolhe os exercícios da
// biblioteca com séries × reps e começa o treino livre já com essa meta.
// Nada vai para a ficha (vale só para hoje).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { EscolherExercicio, type ItemBusca } from "@/components/livre/EscolherExercicio";

type Linha = { id: string; nome: string; series: number; reps: string };
const REPS = ["6-8", "8-10", "10-12", "12-15", "15-20"];
const novaChave = () => `hoje-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function MontarTreinoDeHoje({ itens }: { itens: ItemBusca[] }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mudar = (i: number, p: Partial<Linha>) => setLinhas((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const mover = (i: number, d: -1 | 1) => setLinhas((ls) => { const j = i + d; if (j < 0 || j >= ls.length) return ls; const c = [...ls]; [c[i], c[j]] = [c[j], c[i]]; return c; });

  async function comecar() {
    setEnviando(true);
    setErro(null);
    const corpo = { client_key: novaChave(), montado: { titulo: titulo.trim() || "Treino de hoje", itens: linhas.map((l) => ({ biblioteca_id: l.id, series: l.series, reps: l.reps })) } };
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
                <span className="text-xs text-fg-muted">Séries</span>
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
            </li>
          ))}
        </ol>
      ) : null}
      {buscando ? (
        <EscolherExercicio itens={itens} onEscolher={(it) => { setLinhas((ls) => [...ls, { id: it.id, nome: it.nome, series: 3, reps: "10-12" }].slice(0, 15)); setBuscando(false); }} onFechar={() => setBuscando(false)} />
      ) : (
        <button type="button" disabled={linhas.length >= 15} onClick={() => setBuscando(true)} className="touch w-full rounded-xl border border-dashed border-accent px-3 py-3 text-sm font-bold text-accent disabled:opacity-50">＋ {linhas.length ? "Pôr mais um exercício" : "Escolher o primeiro exercício"}</button>
      )}
      {erro ? <p role="alert" className="rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm">{erro}</p> : null}
      {linhas.length ? (
        <button type="button" disabled={enviando} onClick={() => void comecar()} className="touch w-full rounded-xl bg-accent px-3 py-3 font-black text-bg disabled:opacity-60">{enviando ? "Abrindo…" : `▶ Começar este treino (${linhas.length} exercício${linhas.length === 1 ? "" : "s"})`}</button>
      ) : null}
    </div>
  );
}
