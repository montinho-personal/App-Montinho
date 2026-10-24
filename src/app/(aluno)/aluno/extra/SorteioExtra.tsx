"use client";

// “O Montinho sorteia” no treino extra (pedido do Montinho, 24/10/2026): o
// guia sorteia um treino dos prontos (Shape de Verão, Rainha do Agachamento…),
// a pessoa vê os exercícios e aceita ou vai para a próxima rodada.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Montinho } from "@/components/jornada-chalala/Personagens";
import { useToast } from "@/components/ui/Toast";
import type { CorpoExtra, ResultadoExtraGerado } from "@/lib/treino/extra-gerado";
import type { SorteioExtra as Sorteio } from "@/lib/data/extra-gerado";
import { BRAND } from "@/config/brand";

const chave = () => `extra-sorteio:${new Date().toISOString().slice(0, 10)}:${Math.random().toString(36).slice(2, 10)}`;

export function SorteioExtra({ corpo }: { corpo: CorpoExtra | null }) {
  const router = useRouter();
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [girando, setGirando] = useState(false);
  const [rodada, setRodada] = useState(0);
  const [vistos, setVistos] = useState<string[]>([]);
  const [sorteio, setSorteio] = useState<Sorteio | null>(null);
  const [resultado, setResultado] = useState<ResultadoExtraGerado | null>(null);
  const [nomeGirando, setNomeGirando] = useState<string | null>(null);
  const [comecando, setComecando] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  async function sortear() {
    if (!corpo) return;
    setAberto(true);
    setGirando(true);
    setResultado(null);
    const r = await fetch("/api/extras/montar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: "sorteio", corpo, vistos }) })
      .then((x) => x.json())
      .catch(() => null) as { ctx?: { bloqueio: string | null }; sorteio?: Sorteio | null; resultado?: ResultadoExtraGerado | null } | null;
    if (!r) { setGirando(false); setAberto(false); return toast.error("Não foi possível sortear agora. Tente de novo."); }
    if (r.ctx?.bloqueio) { setGirando(false); setAberto(false); router.refresh(); return; }
    const final = r.sorteio ?? null;
    const roleta = final?.roleta.length ? final.roleta : [];
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let passo = 0;
    const total = reduzido || !roleta.length ? 1 : 14;
    const girar = () => {
      passo++;
      if (passo >= total) {
        setNomeGirando(null);
        setSorteio(final);
        setResultado(r.resultado ?? null);
        setGirando(false);
        setRodada((n) => n + 1);
        if (final) setVistos((v) => (final.recomecou ? [final.chave] : [...v, final.chave]));
        return;
      }
      setNomeGirando(roleta[Math.floor(Math.random() * roleta.length)]);
      timer.current = window.setTimeout(girar, 60 + passo * 18);
    };
    girar();
  }

  async function comecar() {
    if (!sorteio || !corpo) return;
    setComecando(true);
    const r = await fetch("/api/extras/montar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: "sorteio", corpo, chave: sorteio.chave, iniciar: true, client_key: chave() }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { id?: string; treinoId?: string; error?: string } | null;
    if (!r?.ok || !d?.id) { setComecando(false); return toast.error(d?.error ?? "Não foi possível começar agora."); }
    router.push(`/aluno/treino/${d.treinoId}?sessao=${d.id}`);
  }

  const ok = resultado?.ok ? resultado.extra : null;
  return (
    <>
      {corpo === "dor" ? (
        <p className="rounded-lg border border-warning/40 bg-warning/5 p-3">Com dor forte, nada de extra hoje. Converse com o {BRAND.name} pelo WhatsApp antes de treinar mais.</p>
      ) : (
        <button type="button" disabled={!corpo} onClick={() => void sortear()} className="alvo flex w-full items-center gap-3 rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_75%)] px-4 py-3 text-left disabled:opacity-50">
          <Montinho tamanho={56} />
          <span className="flex-1">
            <span className="block font-black">🎲 O Montinho sorteia!</span>
            <span className="block text-xs text-fg-muted">{corpo ? "Ele sorteia um dos treinos prontos. Você vê os exercícios e decide." : "Primeiro diga como está o seu corpo."}</span>
          </span>
        </button>
      )}
      {aberto ? (
        <div role="dialog" aria-modal="true" aria-label="Sorteio do treino extra" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 p-3 sm:items-center" onClick={() => !girando && !comecando && setAberto(false)}>
          <div className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border-2 border-accent bg-[linear-gradient(160deg,#3a3016_0%,#171717_70%)] p-5 text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`mx-auto w-fit ${girando ? "motion-safe:animate-bounce" : ""}`}>
              <Montinho tamanho={88} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider text-accent">{girando ? "O Montinho está sorteando…" : sorteio ? `Rodada ${rodada} · o Montinho decidiu!` : "Sorteio"}</p>
            {girando ? (
              <div aria-live="polite" className="rounded-xl border border-border bg-bg/60 p-4 opacity-80">
                <p className="text-xl font-black">{nomeGirando ?? "🎲"}</p>
              </div>
            ) : sorteio && ok ? (
              <div aria-live="polite" className="space-y-3 text-left">
                <div className="rounded-xl border border-border bg-bg/60 p-4 text-center">
                  <p className="text-4xl" aria-hidden>{sorteio.emoji}</p>
                  <p className="mt-1 text-xl font-black">{sorteio.nome}</p>
                  <p className="text-sm font-semibold text-accent">Treino {sorteio.letra} · {sorteio.nomeTreino}</p>
                  <p className="mt-1 text-xs text-fg-muted">{sorteio.chamada}</p>
                </div>
                {sorteio.recomecou ? <p className="text-center text-xs text-fg-muted">Você já viu todas as opções de hoje. O sorteio recomeçou.</p> : null}
                <div className="rounded-xl border border-border bg-bg/60 p-3 text-sm">
                  <p className="text-xs text-fg-muted">{ok.exercicios.length} exercícios · {ok.series} séries · cerca de {ok.duracaoMin} min</p>
                  <ol className="mt-2 space-y-1">
                    {ok.exercicios.map((x, i) => (
                      <li key={x.id} className="flex justify-between gap-3">
                        <span>{i + 1}. {x.nome}</span>
                        <span className="shrink-0 text-xs text-fg-muted">{x.series} × {x.reps}</span>
                      </li>
                    ))}
                  </ol>
                  {ok.avisos.length ? <ul className="mt-2 space-y-0.5 text-[11px] text-fg-subtle">{ok.avisos.map((a) => <li key={a}>{a}</li>)}</ul> : null}
                  <p className="mt-2 text-[11px] text-fg-subtle">Versão de treino extra: 2 repetições sobrando, sem técnica avançada. Não conta na meta semanal.</p>
                </div>
                <button type="button" disabled={comecando} onClick={() => void comecar()} className="alvo flex min-h-12 w-full items-center justify-center rounded-xl bg-accent px-4 text-base font-bold text-bg disabled:opacity-60">
                  {comecando ? "Abrindo…" : "✅ Vale esse! Começar"}
                </button>
                <button type="button" disabled={comecando} onClick={() => void sortear()} className="alvo w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">
                  🎲 Não curti, sortear de novo
                </button>
              </div>
            ) : (
              <div aria-live="polite" className="space-y-3">
                <p className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-sm">{resultado && !resultado.ok ? resultado.motivo : "Não deu para sortear agora."}</p>
                {sorteio ? (
                  <button type="button" onClick={() => void sortear()} className="alvo w-full rounded-xl border border-border px-4 py-2.5 text-sm font-semibold">🎲 Sortear de novo</button>
                ) : null}
              </div>
            )}
            {!girando ? (
              <button type="button" onClick={() => setAberto(false)} className="w-full py-1 text-xs text-fg-muted underline-offset-2 hover:underline">Fechar</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
