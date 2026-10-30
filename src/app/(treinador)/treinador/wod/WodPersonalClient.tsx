"use client";

// WOD do dia — personal (0134): monta com o mesmo editor de blocos do
// montador, publica para o dia (todos os alunos veem em “WOD do dia”) e
// acompanha o ranking do dia com o nome completo.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditorBlocos } from "@/components/montador/EditorBlocos";
import { RankingWod } from "@/components/wod/RankingWod";
import { useToast } from "@/components/ui/Toast";
import { blocosIniciais, resumoBloco } from "@/lib/modalidades/blocos";
import { MODALIDADES_TREINO, type BlocoTreino } from "@/lib/modalidades/tipos";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { LinhaRankingWod, WodDoDia } from "@/lib/data/wod-dia";

type Modal = WodDoDia["modalidade"];
const MODAIS: Modal[] = ["cross", "hyrox", "funcional", "hibrido"];
const fmtData = (d: string) => d.split("-").reverse().join("/");

export function WodPersonalClient({ hoje, wods, itens, rankingHoje }: { hoje: string; wods: WodDoDia[]; itens: ItemBiblioteca[]; rankingHoje: LinhaRankingWod[] }) {
  const doDia = wods.find((w) => w.data === hoje && w.publicado) ?? null;
  const [editando, setEditando] = useState<WodDoDia | null>(doDia);
  const [data, setData] = useState(doDia?.data ?? hoje);
  const [titulo, setTitulo] = useState(doDia?.titulo ?? "");
  const [obs, setObs] = useState(doDia?.observacoes ?? "");
  const [modalidade, setModalidade] = useState<Modal>(doDia?.modalidade ?? "cross");
  const [blocos, setBlocos] = useState<BlocoTreino[]>(doDia?.blocos ?? blocosIniciais("cross"));
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const router = useRouter();

  function abrir(w: WodDoDia | null) {
    setEditando(w);
    setData(w?.data ?? hoje);
    setTitulo(w?.titulo ?? "");
    setObs(w?.observacoes ?? "");
    setModalidade(w?.modalidade ?? "cross");
    setBlocos(w?.blocos ?? blocosIniciais("cross"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function salvar(publicado: boolean) {
    if (titulo.trim().length < 2) return toast.error("Dê um nome ao WOD (ex.: Sexta de Fogo).");
    setSalvando(true);
    const r = await fetch("/api/treinador/wod", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editando?.id ?? null, data, titulo: titulo.trim(), modalidade, blocos, observacoes: obs.trim() || null, publicado }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as (WodDoDia & { error?: string }) | null;
    setSalvando(false);
    if (!r?.ok || !d) return toast.error(d?.error ?? "Não foi possível salvar agora.");
    toast.success(publicado ? `WOD publicado para ${data === hoje ? "hoje" : fmtData(data)}! Todos os alunos já veem.` : "WOD tirado do ar.");
    setEditando(d);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
      <div>
        <h1 className="text-2xl font-black">🔥 WOD do dia</h1>
        <p className="text-sm text-fg-muted">Um WOD para todo mundo. Os alunos fazem com o relógio, anotam RX/Scaled e veem o ranking do dia. Conta como treino extra (não mexe na meta semanal da ficha).</p>
      </div>

      <section className="space-y-3 rounded-2xl border border-border bg-card">
        <div className="grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 80))} placeholder="Nome do WOD (ex.: Sexta de Fogo)" aria-label="Nome do WOD" className="h-11 rounded-lg border border-border bg-bg px-3 text-base font-bold" />
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} aria-label="Dia" className="h-11 rounded-lg border border-border bg-bg px-3 text-sm" />
          <select value={modalidade} onChange={(e) => { const m = e.target.value as Modal; setModalidade(m); if (!editando) setBlocos(blocosIniciais(m)); }} aria-label="Tipo" className="h-11 rounded-lg border border-border bg-bg px-2 text-sm">
            {MODAIS.map((m) => <option key={m} value={m}>{MODALIDADES_TREINO[m].emoji} {MODALIDADES_TREINO[m].nome}</option>)}
          </select>
          <textarea value={obs} onChange={(e) => setObs(e.target.value.slice(0, 500))} rows={2} placeholder="Recado para os alunos (opcional): ex.: escolha a carga que deixa terminar em 10 min" aria-label="Recado" className="rounded-lg border border-border bg-bg p-2 text-sm sm:col-span-3" />
        </div>
        <EditorBlocos modalidade={modalidade} blocos={blocos} onChange={setBlocos} itens={itens} favoritos={new Set()} uso={new Map()} />
        <div className="flex flex-wrap gap-2 p-3 pt-0">
          <button type="button" disabled={salvando} onClick={() => void salvar(true)} className="alvo flex-1 rounded-xl bg-accent px-4 py-3 font-black text-bg disabled:opacity-60">{salvando ? "Salvando…" : editando?.publicado ? "💾 Salvar e manter publicado" : "📣 Publicar para os alunos"}</button>
          {editando?.publicado ? <button type="button" disabled={salvando} onClick={() => void salvar(false)} className="alvo rounded-xl border border-border px-4 py-3 text-sm font-semibold">Tirar do ar</button> : null}
          {editando ? <button type="button" onClick={() => abrir(null)} className="alvo rounded-xl border border-border px-4 py-3 text-sm font-semibold">＋ Novo WOD</button> : null}
        </div>
      </section>

      {doDia ? <RankingWod linhas={rankingHoje} titulo={`🏆 Ranking de hoje · ${doDia.titulo}`} /> : <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-fg-muted">Nenhum WOD publicado para hoje ainda.</p>}

      {wods.length ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Últimos WODs</h2>
          <ul className="space-y-1.5">
            {wods.map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => abrir(w)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left hover:border-accent">
                  <span className="w-14 shrink-0 font-mono text-xs text-fg-muted">{fmtData(w.data).slice(0, 5)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{w.titulo}</span>
                    <span className="block truncate text-[11px] text-fg-subtle">{w.blocos.filter((b) => b.tipo === "metcon").map(resumoBloco).join(" · ") || `${w.blocos.length} blocos`}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${w.publicado ? "bg-success/15 text-success" : "bg-fg/10 text-fg-muted"}`}>{w.publicado ? "No ar" : "Fora do ar"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
