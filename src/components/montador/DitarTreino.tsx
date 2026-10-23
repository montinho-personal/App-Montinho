"use client";

// Ditar treino: o personal fala (microfone do navegador ou do teclado) e o app
// monta os exercícios (regras em src/lib/treino/ditado.ts). Sempre mostra a
// prévia; nada entra no treino sem tocar em "Aplicar".
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { METODOS } from "@/lib/volume/tecnicas";
import { GRUPO_COR } from "@/lib/grupos";
import { configDaLinha, interpretarDitado, juntarFala, metodoFinal, resumoSeries, type LinhaDitada } from "@/lib/treino/ditado";
import { useFecharComVoltar } from "@/lib/useFecharComVoltar";
import { ditadoDaIA } from "@/lib/treino/ditado-ia";
import { useDitadoIA } from "@/components/voz/useDitadoIA";

export type { LinhaDitada };

type Props = {
  letra: string;
  foco?: string;
  itens: ItemBiblioteca[];
  favoritos: Set<string>;
  uso: Map<string, number>;
  /** Quantos exercícios o treino já tem (com nome). */
  existentes: number;
  onAplicar: (linhas: LinhaDitada[], substituir: boolean) => void;
};

type ResultadoFala = { isFinal: boolean; 0: { transcript: string } };
type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ResultadoFala> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function criarReconhecimento(): Reconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
  // O prefixado é o motor consolidado do Chrome/Android; o sem prefixo (novo)
  // pode falhar em silêncio em algumas versões.
  const Ctor = w.webkitSpeechRecognition ?? w.SpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const ROTULO_METODO = new Map(METODOS.map((m) => [m.v, m.l]));

export function DitarTreino({ letra, foco, itens, favoritos, uso, existentes, onAplicar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [erroMic, setErroMic] = useState<string | null>(null);
  const [substituir, setSubstituir] = useState(false);
  // Escolhas manuais na prévia valem para a fala em que foram feitas.
  const [trocasDe, setTrocasDe] = useState<{ fala: string; trocas: Record<number, string>; removidos: Set<number> }>({ fala: "", trocas: {}, removidos: new Set() });
  const rec = useRef<Reconhecimento | null>(null);
  const [temMic, setTemMic] = useState(false);
  useFecharComVoltar(aberto, () => setAberto(false));

  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      rec.current?.stop();
    };
  }, [aberto]);

  const fala = texto.trim();
  const local = useMemo(() => interpretarDitado(fala, itens, { favoritos, uso }), [fala, itens, favoritos, uso]);
  // Ditado inteligente: quando a pessoa para de falar/digitar, a IA organiza a fala.
  const ia = useDitadoIA();
  const resIA = ia.resultadoPara(fala);
  const ditado = useMemo(() => (resIA ? ditadoDaIA(resIA, itens, { favoritos, uso }) : local), [resIA, local, itens, favoritos, uso]);
  const { organizar, disponivel: iaDisponivel } = ia;
  useEffect(() => {
    if (!aberto || ouvindo || !iaDisponivel || fala.length < 3) return;
    const id = window.setTimeout(() => void organizar(fala), 900);
    return () => window.clearTimeout(id);
  }, [aberto, ouvindo, fala, iaDisponivel, organizar]);
  const trocas = trocasDe.fala === fala ? trocasDe.trocas : {};
  const removidos = trocasDe.fala === fala ? trocasDe.removidos : new Set<number>();
  const setTrocas = (fn: (t: Record<number, string>) => Record<number, string>) => setTrocasDe({ fala, trocas: fn(trocas), removidos });
  const setRemovidos = (fn: (r: Set<number>) => Set<number>) => setTrocasDe({ fala, trocas, removidos: fn(removidos) });

  const porId = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const linhas = ditado.exercicios.map((e, i) => {
    const m = metodoFinal(e, ditado.metodoGeral);
    const item = (trocas[i] ? porId.get(trocas[i]) : null) ?? e.escolhido;
    const cabecalho = e.bloco != null && (i === 0 || ditado.exercicios[i - 1].bloco !== e.bloco);
    return { i, e, cabecalho, linha: item ? ({ item, series: e.series, reps: e.reps, descansoSeg: e.descansoSeg, tecnica: m.tecnica, piramide: m.piramide, bloco: e.bloco } as LinhaDitada) : null };
  });
  const validas = linhas.filter((l) => l.linha && !removidos.has(l.i)).map((l) => l.linha!);

  // Uma sessão por frase (no Android o modo "contínuo" repete/perde palavras):
  // quando a pessoa pausa, a sessão termina e religamos sozinhos até ela tocar
  // em parar. A fala vai direto para o texto, inclusive a parcial.
  const querOuvir = useRef(false);
  const textoRef = useRef("");
  useEffect(() => {
    textoRef.current = texto;
  }, [texto]);

  function iniciarSessao() {
    const r = criarReconhecimento();
    if (!r) return;
    const base = textoRef.current.trim();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (ev) => {
      const partes = Array.from(ev.results).map((x) => x[0]?.transcript ?? "");
      // Android: cada resultado já traz a frase inteira até ali — vale o último.
      const falado = /Android/i.test(navigator.userAgent) ? (partes[partes.length - 1] ?? "").trim() : juntarFala(partes);
      const novo = juntarFala([base, falado]);
      textoRef.current = novo;
      setTexto(novo);
    };
    r.onerror = (ev) => {
      if (ev.error === "aborted") return;
      if (ev.error === "no-speech") {
        // Pausa longa depois de ditar = terminou; só avisa se nada foi dito.
        querOuvir.current = false;
        if (!textoRef.current.trim()) setErroMic("Não ouvi nada. Toque e fale de novo.");
        return;
      }
      querOuvir.current = false;
      setErroMic(ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Permita o microfone para este site (cadeado ao lado do endereço → Permissões → Microfone)." : ev.error === "network" ? "O reconhecimento de voz precisa de internet. Tente de novo." : "O microfone parou. Toque para continuar.");
    };
    r.onend = () => {
      if (querOuvir.current) {
        try {
          iniciarSessao();
          return;
        } catch {
          querOuvir.current = false;
        }
      }
      setOuvindo(false);
      if (!textoRef.current.trim()) setErroMic((e) => e ?? "Não captei nenhuma fala. Toque de novo e fale perto do celular — ou use o microfone do teclado na caixa abaixo.");
    };
    rec.current = r;
    r.start();
  }

  function ouvir() {
    setErroMic(null);
    if (ouvindo) {
      querOuvir.current = false;
      rec.current?.stop();
      setOuvindo(false);
      return;
    }
    try {
      querOuvir.current = true;
      iniciarSessao();
      setOuvindo(true);
    } catch {
      querOuvir.current = false;
      setErroMic("Não foi possível ligar o microfone.");
    }
  }

  function aplicar() {
    querOuvir.current = false;
    rec.current?.stop();
    onAplicar(validas, substituir);
    setAberto(false);
    setTexto("");
  }

  const fechar = () => {
    querOuvir.current = false;
    rec.current?.stop();
    setAberto(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSubstituir(false);
          setTemMic(!!criarReconhecimento());
          setAberto(true);
        }}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-accent/50 bg-accent/10 px-2 text-[11px] font-semibold text-accent hover:bg-accent/20"
        title="Montar este treino falando os exercícios"
      >
        🎤 Ditar
      </button>
      {aberto
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Ditar treino ${letra}`}>
              <button type="button" aria-label="Fechar" onClick={fechar} className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
              <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl">
                <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border sm:hidden" aria-hidden />
                <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold">🎤 Ditar treino {letra}</p>
                    {foco ? <p className="text-xs text-fg-muted">Foco: {foco}</p> : null}
                  </div>
                  <button type="button" onClick={fechar} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-fg-muted hover:text-fg">
                    ✕
                  </button>
                </div>

                <div className="overflow-y-auto overscroll-contain px-4 pb-3">
                  {temMic ? (
                    <button
                      type="button"
                      onClick={ouvir}
                      aria-pressed={ouvindo}
                      className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${ouvindo ? "animate-pulse bg-danger text-white" : "bg-accent text-bg"}`}
                    >
                      {ouvindo ? "● Ouvindo… toque para parar" : "🎤 Toque e fale o treino"}
                    </button>
                  ) : null}
                  {erroMic ? <p className="mb-2 text-xs text-warning">{erroMic}</p> : null}
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={3}
                    aria-label="Texto do treino"
                    placeholder="Ex.: crucifixo máquina, supino inclinado, supino reto barra 4 de 10, elevação lateral e um bi-set de desenvolvimento com elevação frontal. Todos em pirâmide crescente."
                    className="w-full rounded-xl border border-border bg-bg p-3 text-sm outline-none focus:border-accent"
                  />
                  {!temMic ? <p className="mt-1 text-[11px] text-fg-subtle">Dica: use o microfone do teclado do celular para ditar aqui.</p> : null}
                  {ia.disponivel && fala ? (
                    <p className="mt-1 text-[11px] font-semibold" role="status">
                      {ia.lendo ? <span className="text-accent">✨ Organizando com IA…</span> : resIA ? <span className="text-accent">✨ Organizado pela IA · confira e ajuste</span> : ia.falhou ? <span className="text-warning">A IA não conseguiu agora; usei a leitura simples.</span> : null}
                    </p>
                  ) : null}

                  {ditado.metodoGeral ? (
                    <p className="mt-3 text-xs font-semibold text-accent">Todos em {ROTULO_METODO.get(ditado.metodoGeral) ?? ditado.metodoGeral}</p>
                  ) : null}
                  {linhas.length ? (
                    <ol className="mt-2 space-y-1">
                      {linhas.map(({ i, e, linha, cabecalho }) => {
                        const fora = removidos.has(i);
                        return (
                          <li key={i}>
                            {cabecalho ? <p className="mt-2 rounded-t-lg border border-b-0 border-accent/60 bg-accent/15 px-3 py-1 text-[11px] font-bold text-accent">🔗 {ROTULO_METODO.get(linha?.tecnica ?? "biset")}</p> : null}
                            <div className={`flex items-center gap-2 rounded-lg border px-2 py-2 ${e.bloco != null ? "border-accent/40 bg-accent/[0.06]" : "border-border"} ${fora ? "opacity-40" : ""}`}>
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: linha ? GRUPO_COR[linha.item.grupo] : undefined }} aria-hidden />
                              <div className="min-w-0 flex-1">
                                <select
                                  value={linha?.item.id ?? ""}
                                  onChange={(ev) => setTrocas((t) => ({ ...t, [i]: ev.target.value }))}
                                  aria-label={`Exercício ${i + 1}`}
                                  className={`w-full truncate rounded-md border bg-bg px-1.5 py-1 text-sm font-semibold ${e.confianca === "confira" && !trocas[i] ? "border-warning/70" : "border-transparent"}`}
                                >
                                  {e.candidatos.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.nome}
                                    </option>
                                  ))}
                                </select>
                                <p className="px-1.5 text-[11px] text-fg-muted">
                                  {linha ? resumoSeries(configDaLinha(linha)) : ""}
                                  {linha && linha.tecnica !== "normal" && e.bloco == null ? ` · ${ROTULO_METODO.get(linha.tecnica)}` : ""}
                                  {linha?.piramide && e.bloco != null ? ` · Pirâmide ${linha.piramide}` : ""}
                                  {e.confianca === "confira" && !trocas[i] ? <span className="text-warning"> · confira o exercício</span> : null}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setRemovidos((r) => {
                                    const n = new Set(r);
                                    if (n.has(i)) n.delete(i);
                                    else n.add(i);
                                    return n;
                                  })
                                }
                                aria-label={fora ? `Voltar exercício ${i + 1}` : `Tirar exercício ${i + 1}`}
                                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-fg-subtle hover:text-fg"
                              >
                                {fora ? "↺" : "✕"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : fala ? (
                    <p className="mt-3 text-sm text-fg-muted">Ainda não reconheci nenhum exercício.</p>
                  ) : null}
                  {ditado.naoEntendido.length ? <p className="mt-2 text-xs text-warning">Não entendi: “{ditado.naoEntendido.join("”, “")}”. Corrija no texto acima.</p> : null}
                </div>

                <div className="border-t border-border px-4 py-3">
                  {existentes > 0 ? (
                    <label className="mb-2 flex items-center gap-2 text-xs text-fg-muted">
                      <input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} className="h-4 w-4" />
                      Substituir os {existentes} exercício(s) que já estão no treino {letra} (senão, entram no fim)
                    </label>
                  ) : null}
                  <button type="button" disabled={!validas.length || ia.lendo} onClick={aplicar} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-bg disabled:opacity-40">
                    Aplicar {validas.length || ""} exercício(s) no treino {letra}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
