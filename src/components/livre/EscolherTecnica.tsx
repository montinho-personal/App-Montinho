"use client";

// Escolher a técnica de um exercício na hora (treino livre), com as perguntas
// certas para cada uma (pedido do Montinho, 29/10/2026):
//  • juntar (bi-set/tri-set/superset): com qual exercício (deste treino ou um novo);
//  • técnica na série (rest-pause, drop-set, myo-reps, cluster, 3/7): só para
//    finalizar ou em quantas séries, quantos blocos e a pausa;
//  • jeito de fazer: só escolher.
import { useState } from "react";
import { COR_TECNICA } from "@/lib/volume/tecnicas";
import type { Tecnica } from "@/lib/volume/calcular";
import { instrucaoTecnica, podeFinalizar, type ConfigTecnica } from "@/lib/treino/tecnica-config";
import { configDasRespostas, GRUPOS_TECNICA, infoTecnica, perguntasDaTecnica, respostasDaConfig, TECNICAS_ALUNO, type RespostasTecnica } from "@/lib/treino/tecnica-aluno";

export type EscolhaTecnica = {
  tecnica: Tecnica;
  config: ConfigTecnica | null;
  /** Bi-set/tri-set: exercícios deste treino que entram junto. */
  parceiros: string[];
  /** Bi-set/tri-set: falta escolher exercício(s) novo(s) na busca. */
  novos: number;
};

function Contador({ valor, min, max, onChange, sufixo }: { valor: number; min: number; max: number; onChange: (n: number) => void; sufixo?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-xl border border-border bg-bg p-1">
      <button type="button" onClick={() => onChange(Math.max(min, valor - 1))} disabled={valor <= min} className="grid h-10 w-10 place-items-center rounded-lg text-xl font-bold disabled:opacity-30" aria-label="Menos">−</button>
      <span className="min-w-12 text-center font-mono text-lg font-bold tabular-nums" aria-live="polite">{valor}{sufixo ?? ""}</span>
      <button type="button" onClick={() => onChange(Math.min(max, valor + 1))} disabled={valor >= max} className="grid h-10 w-10 place-items-center rounded-lg text-xl font-bold disabled:opacity-30" aria-label="Mais">+</button>
    </span>
  );
}

export function EscolherTecnica({ nome, atual, configAtual, outros, onEscolher, onFechar }: {
  nome: string;
  atual: string;
  configAtual: ConfigTecnica | null;
  /** Outros exercícios deste treino que ainda podem entrar num bi-set. */
  outros: Array<{ seId: string; nome: string }>;
  onEscolher: (e: EscolhaTecnica) => void;
  onFechar: () => void;
}) {
  const [tecnica, setTecnica] = useState<string | null>(atual !== "normal" ? atual : null);
  const [resp, setResp] = useState<RespostasTecnica>(() => respostasDaConfig(atual, configAtual));
  const [parceiros, setParceiros] = useState<string[]>([]);
  const info = infoTecnica(tecnica);
  const perg = perguntasDaTecnica(tecnica);
  const cor = (tecnica && COR_TECNICA[tecnica as Tecnica]) || "#ba9e50";

  function escolher(t: string) {
    setTecnica(t);
    setResp(respostasDaConfig(t, t === atual ? configAtual : null));
    setParceiros([]);
  }
  const config = tecnica ? configDasRespostas(tecnica, resp) : null;
  const precisa = info?.exercicios ? info.exercicios - 1 : 0;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tecnica-titulo" className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-bg p-4 pb-8 sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Técnica</p>
            <h2 id="tecnica-titulo" className="text-lg font-bold leading-tight">{tecnica && info ? info.nome : "Como vai fazer?"}</h2>
            <p className="text-xs text-fg-muted">{nome}</p>
          </div>
          <button type="button" onClick={onFechar} className="alvo rounded-md px-2 py-1 text-fg-muted" aria-label="Fechar">✕</button>
        </div>

        {!tecnica ? (
          <div className="space-y-4">
            {atual !== "normal" ? (
              <button type="button" onClick={() => onEscolher({ tecnica: "normal", config: null, parceiros: [], novos: 0 })} className="alvo w-full rounded-xl border border-border px-4 py-3 text-left text-sm font-semibold">
                ↩ Sem técnica (séries normais)
              </button>
            ) : null}
            {GRUPOS_TECNICA.map((g) => (
              <section key={g.id} className="space-y-2">
                <div>
                  <h3 className="text-sm font-bold">{g.titulo}</h3>
                  <p className="text-xs text-fg-subtle">{g.dica}</p>
                </div>
                <div className="grid gap-2">
                  {TECNICAS_ALUNO.filter((t) => t.grupo === g.id).map((t) => {
                    const c = COR_TECNICA[t.id] ?? "#ba9e50";
                    return (
                      <button key={t.id} type="button" onClick={() => escolher(t.id)} className="flex min-h-11 w-full flex-col items-start rounded-xl border border-border border-l-4 bg-card px-3 py-2.5 text-left hover:border-accent/60" style={{ borderLeftColor: c }}>
                        <span className="block text-sm font-bold" style={{ color: c }}>{t.nome}</span>
                        <span className="block text-xs text-fg-muted">{t.oQueE}</span>
                        <span className="mt-0.5 block text-[11px] text-fg-subtle">Ex.: {t.exemplo}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border-l-4 bg-card px-3 py-2.5" style={{ borderLeftColor: cor }}>
              <p className="text-sm">{info?.oQueE}</p>
              <p className="mt-1 text-xs text-fg-subtle">Ex.: {info?.exemplo}</p>
            </div>

            {info?.exercicios ? (
              <section className="space-y-2">
                <h3 className="text-sm font-bold">Junte com {precisa === 1 ? "qual exercício?" : `quais ${precisa} exercícios?`}</h3>
                <p className="text-xs text-fg-muted">Faça um depois do outro, sem descanso. O descanso vem só no fim da rodada.</p>
                {outros.length ? (
                  <div className="grid gap-2">
                    {outros.map((o) => {
                      const on = parceiros.includes(o.seId);
                      return (
                        <button key={o.seId} type="button" aria-pressed={on} onClick={() => setParceiros((l) => (on ? l.filter((x) => x !== o.seId) : l.length < precisa ? [...l, o.seId] : [...l.slice(1), o.seId]))} className={`alvo flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${on ? "border-accent bg-accent/15 font-semibold" : "border-border"}`}>
                          <span aria-hidden>{on ? "☑️" : "⬜"}</span> {o.nome}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <p className="text-xs text-fg-subtle">
                  {parceiros.length >= precisa ? "Pronto para juntar." : outros.length ? `Ou escolha ${precisa - parceiros.length === 1 ? "um exercício novo" : `${precisa - parceiros.length} exercícios novos`} depois de confirmar.` : `Depois de confirmar, escolha ${precisa === 1 ? "o outro exercício" : "os outros exercícios"} na busca.`}
                </p>
              </section>
            ) : null}

            {perg?.onde ? (
              <section className="space-y-2">
                <h3 className="text-sm font-bold">Como vai usar?</h3>
                <div className="grid gap-2">
                  {podeFinalizar(tecnica) ? (
                    <button type="button" aria-pressed={resp.onde === "finalizar"} onClick={() => setResp((r) => ({ ...r, onde: "finalizar", series: 1 }))} className={`flex min-h-11 w-full flex-col items-start rounded-xl border px-3 py-2.5 text-left ${resp.onde === "finalizar" ? "border-accent bg-accent/15" : "border-border"}`}>
                      <span className="block text-sm font-bold">🏁 Só para finalizar</span>
                      <span className="block text-xs text-fg-muted">Faz as séries normais e, no fim, 1 série a mais com a técnica.</span>
                    </button>
                  ) : null}
                  <button type="button" aria-pressed={resp.onde === "series"} onClick={() => setResp((r) => ({ ...r, onde: "series", series: Math.max(r.series, podeFinalizar(tecnica) ? 2 : 3) }))} className={`flex min-h-11 w-full flex-col items-start rounded-xl border px-3 py-2.5 text-left ${resp.onde === "series" ? "border-accent bg-accent/15" : "border-border"}`}>
                    <span className="block text-sm font-bold">🔁 Em várias séries</span>
                    <span className="block text-xs text-fg-muted">Escolha em quantas séries vai usar a técnica.</span>
                  </button>
                </div>
                {resp.onde === "series" ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <span className="text-sm font-semibold">Quantas séries?</span>
                    <Contador valor={resp.series} min={1} max={6} onChange={(n) => setResp((r) => ({ ...r, series: n }))} />
                  </div>
                ) : null}
              </section>
            ) : null}

            {perg?.blocos ? (
              <section className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{perg.blocos.rotulo}</span>
                  <span className="block text-[11px] text-fg-subtle">{perg.blocos.dica}</span>
                </span>
                <Contador valor={resp.blocos ?? perg.blocos.padrao} min={perg.blocos.min} max={perg.blocos.max} onChange={(n) => setResp((r) => ({ ...r, blocos: n }))} />
              </section>
            ) : null}

            {perg?.pausa ? (
              <section className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Pausa entre os blocos</span>
                  <span className="block text-[11px] text-fg-subtle">{perg.pausa.dica}</span>
                </span>
                <Contador valor={resp.pausaSeg ?? perg.pausa.padrao} min={5} max={60} sufixo=" s" onChange={(n) => setResp((r) => ({ ...r, pausaSeg: n }))} />
              </section>
            ) : null}

            {config ? <p className="rounded-xl bg-card px-3 py-2 text-xs text-fg-muted">💡 {instrucaoTecnica(tecnica, config)}</p> : null}

            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button type="button" onClick={() => setTecnica(null)} className="touch rounded-xl border border-border px-4 font-semibold text-fg-muted">← Outra</button>
              <button
                type="button"
                onClick={() => onEscolher({ tecnica: tecnica as Tecnica, config, parceiros, novos: Math.max(0, precisa - parceiros.length) })}
                className="touch rounded-xl bg-accent px-4 py-3 font-bold text-bg"
              >
                {info?.exercicios ? (parceiros.length >= precisa ? `Juntar em ${info.nome.toLowerCase()}` : "Confirmar e escolher na busca") : `Usar ${info?.nome ?? "técnica"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
