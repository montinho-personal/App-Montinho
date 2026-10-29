"use client";

// Perfil de quem está no ranking (pedido do Montinho, 29/10/2026): os troféus,
// os fatores de desempate na ordem do ranking, ⚔️ Desafiar e 🔥 Cutucar.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CUTUCADAS, fatoresDeDesempate, resumoDesafios, trofeusDoPerfil, type PerfilRanking } from "@/lib/ranking/perfil";
import { PODIO, podioDaPosicao } from "@/lib/ranking/trofeus";

/** Selo cabe no círculo: quanto mais letras, menor a fonte (“Medida”, “Vídeo”). */
const tamanhoSelo = (selo: string) => {
  const n = [...selo].length;
  return n >= 6 ? "text-[9px]" : n === 5 ? "text-[10px]" : n === 4 ? "text-[11px]" : "text-sm";
};

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function PerfilRankingSheet({ refPessoa, nome, posicao, interagir, onFechar }: { refPessoa: string; nome: string; posicao: number; interagir: boolean; onFechar: () => void }) {
  const [perfil, setPerfil] = useState<PerfilRanking | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [cutucando, setCutucando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/ranking/perfil/${encodeURIComponent(refPessoa)}`)
      .then((r) => r.json())
      .then((j: { perfil?: PerfilRanking; error?: string }) => {
        if (!vivo) return;
        if (j.perfil) setPerfil(j.perfil);
        else setErro(j.error ?? "Não foi possível abrir o perfil.");
      })
      .catch(() => vivo && setErro("Sem internet agora."));
    return () => {
      vivo = false;
    };
  }, [refPessoa]);

  async function cutucar(emoji: string) {
    setCutucando(true);
    setMsg(null);
    const r = await fetch("/api/ranking/cutucar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: refPessoa, emoji }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { ok?: boolean; jaHoje?: boolean; error?: string };
    setCutucando(false);
    if (!r?.ok) return setMsg(j.error ?? "Não deu para cutucar agora.");
    setMsg(j.ok ? `${emoji} Cutucada enviada! ${perfil?.nome.split(" ")[0] ?? "A pessoa"} recebe um aviso no celular.` : "Você já cutucou essa pessoa hoje. Amanhã tem mais!");
    if (perfil) setPerfil({ ...perfil, cutuquei_hoje: true });
  }

  if (typeof document === "undefined") return null;
  const p = podioDaPosicao(posicao);
  const trofeus = perfil ? trofeusDoPerfil(perfil) : [];
  const fatores = perfil ? fatoresDeDesempate(perfil) : [];
  const primeiro = (perfil?.nome ?? nome).split(" ")[0];
  const desafios = perfil ? resumoDesafios(perfil.desafios, primeiro, perfil.eu) : null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 sm:items-center" role="dialog" aria-modal="true" aria-label={`Perfil de ${nome}`} onClick={onFechar}>
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg p-4 pb-8 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold" style={p ? { color: PODIO[p].cor } : undefined}>{p ? `${PODIO[p].emoji} ` : ""}{posicao}º lugar</p>
            <h2 className="text-2xl font-black leading-tight">{perfil?.eu ? "Você" : (perfil?.nome ?? nome)}</h2>
            {perfil?.visitante ? <span className="mt-1 inline-block rounded-full border border-border px-2 text-[11px] text-fg-subtle">visitante</span> : null}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo grid h-10 w-10 place-items-center rounded-full border border-border text-lg">✕</button>
        </div>

        {erro ? <p className="mt-4 text-sm text-fg-muted">{erro}</p> : !perfil ? <p className="mt-4 text-sm text-fg-muted">Carregando…</p> : (
          <div className="mt-4 space-y-5">
            {interagir && !perfil.eu ? (
              <section className="space-y-2 rounded-2xl border border-accent/40 bg-grain-strong p-3" aria-label="Interagir">
                <Link href={`/aluno/desafios/novo?com=${encodeURIComponent(nome)}`} className="touch flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-black text-bg">⚔️ Desafiar {primeiro}</Link>
                <p className="text-xs font-semibold">🔥 Cutucar {primeiro} {perfil.cutuquei_hoje ? <span className="font-normal text-fg-muted">(já cutucou hoje)</span> : <span className="font-normal text-fg-muted">(1 por dia, chega no celular)</span>}</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {CUTUCADAS.map((c) => (
                    <button key={c.emoji} type="button" disabled={cutucando || perfil.cutuquei_hoje} onClick={() => void cutucar(c.emoji)} title={c.texto} aria-label={`Cutucar: ${c.texto}`} className="flex min-h-14 flex-col items-center justify-center rounded-xl border border-border bg-bg text-2xl disabled:opacity-40">
                      {c.emoji}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-fg-subtle">{CUTUCADAS.map((c) => `${c.emoji} ${c.texto}`).join(" · ")}</p>
                {msg ? <p className="text-sm font-semibold text-success" role="status">{msg}</p> : null}
              </section>
            ) : null}

            {desafios ? (
              <section aria-labelledby="desafios-perfil">
                <h3 id="desafios-perfil" className="text-xs font-bold uppercase tracking-wider text-fg-muted">⚔️ Desafios</h3>
                <ul className="mt-2 grid grid-cols-3 gap-2">
                  {desafios.numeros.map((n) => (
                    <li key={n.rotulo} className="rounded-xl border border-border bg-surface px-2 py-2 text-center">
                      <p className="text-xl font-black leading-none">{n.valor}</p>
                      <p className="mt-1 text-[10px] leading-tight text-fg-muted"><span aria-hidden>{n.emoji}</span> {n.rotulo}</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-fg-muted">{desafios.frase}</p>
              </section>
            ) : null}

            <section aria-labelledby="desempate-perfil">
              <h3 id="desempate-perfil" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Fatores de desempate (nesta ordem)</h3>
              <ol className="mt-2 divide-y divide-border rounded-xl border border-border bg-surface">
                {fatores.map((f) => (
                  <li key={f.ordem} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{f.ordem}. {f.rotulo}</span>
                      <span className="block text-[11px] text-fg-subtle">{f.ajuda}</span>
                    </span>
                    <span className="shrink-0 font-mono text-sm font-bold">{f.valor}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="trofeus-perfil">
              <h3 id="trofeus-perfil" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Troféus ({trofeus.length})</h3>
              {trofeus.length ? (
                <ul className="mt-2 grid grid-cols-3 gap-2">
                  {trofeus.map((t) => (
                    <li key={t.codigo}>
                      <button type="button" onClick={() => setAberto(aberto === t.codigo ? null : t.codigo)} className={`flex w-full flex-col items-center gap-1 rounded-xl border p-2 text-center ${aberto === t.codigo ? "border-accent" : "border-border"} bg-surface`}>
                        <span className={`grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-accent/70 bg-accent/10 px-0.5 font-black leading-none tracking-tight ${tamanhoSelo(t.selo)}`}>{t.selo}</span>
                        <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{t.nome}</span>
                        {aberto === t.codigo ? <span className="text-[10px] text-fg-muted">{dataBR(t.em)}{t.contaNoRanking ? "" : " · não conta no ranking"}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-fg-muted">Ainda sem troféus.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
