"use client";

// WOD do dia (0134): o mesmo WOD para todos; começa, faz com o relógio,
// anota o resultado e vê o ranking do dia (RX e Scaled separados).
import { useState } from "react";
import Link from "next/link";
import { BlocosWod } from "@/components/wod/BlocosWod";
import { RankingWod } from "@/components/wod/RankingWod";
import { useToast } from "@/components/ui/Toast";
import { CelebracaoMedalha } from "@/components/chalala/CelebracaoMedalha";
import type { ConquistaRow } from "@/lib/data/conquistas";
import type { LinhaRankingWod, WodDoDia } from "@/lib/data/wod-dia";

type SessaoMin = { id: string; status: string };

export function WodDoDiaClient({ wod, sessaoInicial, rankingInicial }: { wod: WodDoDia | null; sessaoInicial: SessaoMin | null; rankingInicial: LinhaRankingWod[] }) {
  const [sessao, setSessao] = useState<SessaoMin | null>(sessaoInicial);
  const [ranking, setRanking] = useState(rankingInicial);
  const [ocupado, setOcupado] = useState(false);
  // Troféus que saíram com este WOD (Primeiro WOD, Dose Dupla…), comemorados aqui mesmo.
  const [trofeus, setTrofeus] = useState<ConquistaRow[]>([]);
  const toast = useToast();

  if (!wod) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black">🔥 WOD do dia</h1>
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-3xl" aria-hidden>📋</p>
          <p className="mt-2 font-bold">Ainda não tem WOD publicado hoje.</p>
          <p className="text-sm text-fg-muted">Quando o Montinho publicar, ele aparece aqui com o ranking do dia.</p>
        </div>
        <Link href="/aluno/treinar" className="alvo block rounded-xl bg-accent px-4 py-3 text-center font-bold text-bg">💪 Ver meus treinos</Link>
      </div>
    );
  }

  async function atualizarRanking() {
    const r = await fetch(`/api/wod/${wod!.id}/ranking`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null) as { linhas?: LinhaRankingWod[] } | null;
    if (r?.linhas) setRanking(r.linhas);
  }

  async function comecar() {
    setOcupado(true);
    const chave = `wod:${wod!.id}:${Date.now().toString(36)}`;
    const r = await fetch("/api/wod/iniciar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wod_id: wod!.id, client_key: chave }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { id?: string; status?: string; error?: string } | null;
    setOcupado(false);
    if (!r?.ok || !d?.id) return toast.error(d?.error ?? "Não foi possível começar agora.");
    setSessao({ id: d.id, status: d.status ?? "em_andamento" });
  }

  async function terminar() {
    if (!sessao) return;
    setOcupado(true);
    const r = await fetch(`/api/sessoes/${sessao.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "concluida" }) }).catch(() => null);
    setOcupado(false);
    if (!r?.ok) return toast.error("Não foi possível terminar agora. Confira a internet.");
    setSessao({ ...sessao, status: "concluida" });
    toast.success("WOD pago! Chalalá! 🔥");
    void atualizarRanking();
    // Mesma conta do fim dos outros treinos: grava e devolve os troféus a comemorar.
    const c = (await fetch(`/api/sessoes/${sessao.id}/chalala`, { cache: "no-store" }).then((x) => (x.ok ? x.json() : null)).catch(() => null)) as { comemorar?: typeof trofeus } | null;
    if (c?.comemorar?.length) setTrofeus(c.comemorar);
  }
  function fecharTrofeus() {
    const ids = trofeus.map((t) => t.id);
    setTrofeus([]);
    if (ids.length) fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }).catch(() => undefined);
  }

  const emAndamento = sessao?.status === "em_andamento";
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">🔥 WOD do dia</p>
        <h1 className="text-2xl font-black leading-tight">{wod.titulo}</h1>
        {wod.observacoes ? <p className="mt-1 text-sm text-fg-muted">{wod.observacoes}</p> : null}
      </div>

      {!sessao ? (
        <button type="button" disabled={ocupado} onClick={() => void comecar()} className="alvo w-full rounded-xl bg-accent px-4 py-3.5 text-lg font-black text-bg disabled:opacity-60">
          {ocupado ? "Começando…" : "▶ Começar o WOD do dia"}
        </button>
      ) : null}

      <BlocosWod key={sessao?.id ?? "previa"} sessaoId={sessao?.id ?? ""} blocos={wod.blocos} ativo={emAndamento} onSalvo={() => void atualizarRanking()} />

      {emAndamento ? (
        <button type="button" disabled={ocupado} onClick={() => void terminar()} className="alvo w-full rounded-xl border-2 border-accent px-4 py-3 text-base font-black text-accent disabled:opacity-60">
          {ocupado ? "Salvando…" : "🏁 Terminar o WOD"}
        </button>
      ) : sessao ? (
        <p className="rounded-xl border border-success/50 bg-success/10 px-3 py-2 text-center text-sm font-bold text-success">✓ WOD de hoje pago. Conta como treino extra na sua Jornada.</p>
      ) : null}

      <RankingWod linhas={ranking} />
      <Link href="/aluno/treinar" className="alvo block rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold">💪 Ver meus treinos</Link>
      {trofeus.length ? <CelebracaoMedalha conquistas={trofeus} onFechar={fecharTrofeus} /> : null}
    </div>
  );
}
