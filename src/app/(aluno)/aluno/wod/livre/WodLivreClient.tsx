"use client";

// WOD livre: 1) monta os blocos (mesmo editor do Montinho) → 2) ▶ Começar →
// 3) relógio e resultado de cada bloco (BlocosWod) → 4) 🏁 Terminar, com os
// troféus comemorados na hora (mesma conta do fim dos outros treinos).
import { useState } from "react";
import Link from "next/link";
import { EditorBlocos } from "@/components/montador/EditorBlocos";
import { BlocosWod } from "@/components/wod/BlocosWod";
import { CelebracaoMedalha } from "@/components/chalala/CelebracaoMedalha";
import { useToast } from "@/components/ui/Toast";
import { useTravaVisitante } from "@/components/visitante/TravaVisitante";
import { blocosIniciais } from "@/lib/modalidades/blocos";
import { MODALIDADES_TREINO, type BlocoTreino } from "@/lib/modalidades/tipos";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import type { ConquistaRow } from "@/lib/data/conquistas";

type Modal = "cross" | "hyrox" | "funcional" | "hibrido";
const MODAIS: Modal[] = ["cross", "hyrox", "funcional", "hibrido"];
// Força com séries e carga fica no treino livre da musculação; aqui só os blocos com resultado.
const semForca = (b: BlocoTreino[]) => b.filter((x) => x.tipo !== "forca");
type SessaoWod = { id: string; status: string; blocos: BlocoTreino[]; modalidade: string; titulo: string };

export function WodLivreClient({ itens, sessaoInicial }: { itens: ItemBiblioteca[]; sessaoInicial: SessaoWod | null }) {
  const toast = useToast();
  const trava = useTravaVisitante();
  const [sessao, setSessao] = useState<SessaoWod | null>(sessaoInicial);
  const [modalidade, setModalidade] = useState<Modal>("cross");
  const [titulo, setTitulo] = useState("");
  const [blocos, setBlocos] = useState<BlocoTreino[]>(() => semForca(blocosIniciais("cross")));
  const [ocupado, setOcupado] = useState(false);
  const [trofeus, setTrofeus] = useState<ConquistaRow[]>([]);
  const idPorSlug = (slug: string) => itens.find((i) => i.slug === slug)?.id ?? null;

  function trocar(m: Modal) {
    setModalidade(m);
    setBlocos(semForca(blocosIniciais(m, idPorSlug)));
  }

  async function comecar() {
    if (trava.travado) return trava.abrir();
    setOcupado(true);
    const client_key = `wodlivre-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const r = await fetch("/api/wod/livre", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: titulo.trim() || null, modalidade, blocos, client_key }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { id?: string; status?: string; error?: string } | null;
    setOcupado(false);
    if (!r?.ok || !d?.id) return toast.error(d?.error ?? "Sem conexão. Confira a internet e tente de novo.");
    setSessao({ id: d.id, status: d.status ?? "em_andamento", blocos, modalidade, titulo: titulo.trim() || "WOD livre" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function terminar() {
    if (!sessao) return;
    setOcupado(true);
    const r = await fetch(`/api/sessoes/${sessao.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "concluida" }) }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return toast.error("Não foi possível terminar agora. Confira a internet.");
    setSessao({ ...sessao, status: "concluida" });
    toast.success("WOD pago! Chalalá! 🔥");
    const c = (await fetch(`/api/sessoes/${sessao.id}/chalala`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null)) as { comemorar?: ConquistaRow[] } | null;
    if (c?.comemorar?.length) setTrofeus(c.comemorar);
  }
  function fecharTrofeus() {
    const ids = trofeus.map((t) => t.id);
    setTrofeus([]);
    if (ids.length) fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => undefined);
  }

  if (!sessao) {
    return (
      <div className="space-y-4">
        <ol className="space-y-2 text-sm">
          <li className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="font-bold text-accent">1</span><span>Escolha o tipo e monte os blocos: formato (AMRAP, EMOM, For Time…), tempo e movimentos.</span></li>
          <li className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="font-bold text-accent">2</span><span>Toque em “▶ Começar”, use o ⏱ relógio e anote o resultado de cada bloco (RX, Scaled ou adaptado).</span></li>
          <li className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"><span className="font-bold text-accent">3</span><span>No fim, “🏁 Terminar”. Já fez o WOD? Monte, comece e anote o resultado na hora.</span></li>
        </ol>
        <section className="space-y-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo do WOD">
            {MODAIS.map((m) => (
              <button key={m} type="button" aria-pressed={modalidade === m} onClick={() => trocar(m)} className={`alvo rounded-full border px-3 py-2 text-sm font-bold ${modalidade === m ? "border-accent bg-accent text-bg" : "border-border text-fg-muted"}`}>
                {MODALIDADES_TREINO[m].emoji} {MODALIDADES_TREINO[m].nome}
              </button>
            ))}
          </div>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value.slice(0, 80))} placeholder="Nome do WOD (opcional, ex.: Fran, WOD da box)" aria-label="Nome do WOD" className="h-11 w-full rounded-lg border border-border bg-bg px-3 text-base" />
        </section>
        <div className="rounded-2xl border border-border bg-card">
          <EditorBlocos modalidade={modalidade} blocos={blocos} onChange={setBlocos} itens={itens} favoritos={new Set()} uso={new Map()} semForca />
        </div>
        <button type="button" disabled={ocupado || !blocos.length} onClick={() => void comecar()} className="alvo w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-black text-bg disabled:opacity-60">
          {ocupado ? "Começando…" : "▶ Começar o WOD"}
        </button>
      </div>
    );
  }

  const emAndamento = sessao.status === "em_andamento";
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">{MODALIDADES_TREINO[sessao.modalidade as Modal]?.emoji ?? "🔥"} WOD livre</p>
        <h2 className="text-xl font-black">{sessao.titulo}</h2>
      </div>
      <BlocosWod sessaoId={sessao.id} blocos={sessao.blocos} ativo={emAndamento} />
      {emAndamento ? (
        <button type="button" disabled={ocupado} onClick={() => void terminar()} className="alvo w-full rounded-xl border-2 border-accent px-4 py-3 text-base font-black text-accent disabled:opacity-60">
          {ocupado ? "Salvando…" : "🏁 Terminar o WOD"}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="rounded-xl border border-success/50 bg-success/10 px-3 py-2 text-center text-sm font-bold text-success">✓ WOD pago! Conta como treino extra na sua Jornada.</p>
          <Link href="/aluno/recordes" className="alvo block rounded-xl bg-accent px-4 py-3 text-center font-bold text-bg">🏅 Ver meus recordes</Link>
        </div>
      )}
      <Link href="/aluno/treinar" className="alvo block rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold">💪 Ver meus treinos</Link>
      {trofeus.length ? <CelebracaoMedalha conquistas={trofeus} onFechar={fecharTrofeus} /> : null}
    </div>
  );
}
