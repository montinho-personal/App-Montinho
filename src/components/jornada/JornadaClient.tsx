"use client";

// Minha Jornada: mapa vertical por capítulos (trilha sinuosa, medalhas,
// “Você está aqui”) e linha do tempo. Só exibe — os estados vêm do motor
// oficial de conquistas, calculado no servidor.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Cenario } from "./Cenario";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import { DetalheMedalha } from "@/components/conquistas/DetalheMedalha";
import { cardDaMedalha } from "@/components/conquistas/VitrineMedalhas";
import { enviarEvento } from "@/components/chalala/evento";
import { CONTEUDO } from "@/lib/conquistas/conteudo";
import type { EventoJornada, Jornada, NoJornada } from "@/lib/conquistas/jornada";
import type { DadosCard, ModeloId } from "@/lib/chalala/card";

const EditorCard = dynamic(() => import("@/components/chalala/EditorCard"), { ssr: false });
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtMes = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" });
const INTRO = "montinho-jornada-intro-v1";

// Geometria da trilha (viewBox de 360 de largura; altura por capítulo).
const PASSO = 128;
const TOPO = 96;
const xDoNo = (i: number) => (i % 2 === 0 ? 92 : 268);

type Stats = { semanas: number; treinos: number; aderencia: number | null; album?: { explorados: number; total: number } };

export function JornadaClient({ jornada, eventos, stats, nome, modo = "aluno", alunoId, reconhecimentos = {}, semTreinos = false }: { jornada: Jornada; eventos: EventoJornada[]; stats: Stats; nome: string; modo?: "aluno" | "treinador"; alunoId?: string; reconhecimentos?: Record<string, { mensagem: string; data: string }>; semTreinos?: boolean }) {
  const [aba, setAba] = useState<"mapa" | "tempo">("mapa");
  const [aberto, setAberto] = useState<NoJornada | null>(null);
  const [editor, setEditor] = useState<{ dados: DadosCard; modelo: ModeloId } | null>(null);
  const [introFechada, setIntroFechada] = useState(false);
  // Introdução só no primeiro acesso deste aparelho (no servidor: nunca).
  const introVista = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return !!localStorage.getItem(INTRO);
      } catch {
        return true;
      }
    },
    () => true,
  );
  const intro = modo === "aluno" && !introVista && !introFechada;
  const aqui = useRef<HTMLDivElement>(null);

  // Índice global de cada nó (para pintar a trilha até a posição atual).
  const indice = useMemo(() => new Map(jornada.nos.map((n, i) => [n.id, i])), [jornada.nos]);

  useEffect(() => {
    if (modo !== "aluno") return;
    enviarEvento({ tipo: "vitrine_vista", origem: "vitrine" });
  }, [modo]);

  useEffect(() => {
    if (aba !== "mapa") return;
    const reduzir = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => aqui.current?.scrollIntoView({ behavior: reduzir ? "auto" : "smooth", block: "center" }), 250);
    return () => clearTimeout(t);
  }, [aba]);

  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto]);

  function fecharIntro() {
    setIntroFechada(true);
    try {
      localStorage.setItem(INTRO, "1");
    } catch {
      /* ignora */
    }
  }

  const prox = jornada.proxima;
  const ultimoCap = jornada.capitulos.at(-1)!.numero;

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold">{modo === "aluno" ? "Minha Jornada" : `Jornada de ${nome}`}</h1>
          <p className="text-sm text-accent">Uma conquista de cada vez.</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Semanas de acompanhamento", String(stats.semanas)],
            ["Treinos concluídos", String(stats.treinos)],
            ["Aderência (4 semanas)", stats.aderencia != null ? `${stats.aderencia}%` : "—"],
          ].map(([r, v]) => (
            <div key={r} className="rounded-xl border border-border bg-card px-2 py-2">
              <dd className="font-mono text-lg font-bold">{v}</dd>
              <dt className="text-[10px] leading-tight text-fg-subtle">{r}</dt>
            </div>
          ))}
        </dl>
        {stats.album ? (
          modo === "aluno" ? (
            <Link href="/aluno/descobertas" className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm hover:border-accent/40">
              <span><span aria-hidden>💡 </span>Montinho Desbloqueia: <strong>{stats.album.explorados} de {stats.album.total}</strong> descobertas</span>
              <span aria-hidden className="text-accent">→</span>
            </Link>
          ) : (
            <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm"><span aria-hidden>💡 </span>Montinho Desbloqueia: <strong>{stats.album.explorados} de {stats.album.total}</strong> descobertas exploradas</p>
          )
        ) : null}
        <div role="tablist" aria-label="Visualização da jornada" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1">
          {(["mapa", "tempo"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`touch rounded-lg text-sm font-semibold ${aba === k ? "bg-accent text-bg" : "text-fg-muted hover:text-fg"}`}>
              {k === "mapa" ? "Mapa da Jornada" : "Linha do Tempo"}
            </button>
          ))}
        </div>
      </header>

      {aba === "mapa" ? (
        <>
          {intro ? (
            <section className="space-y-2 rounded-xl border border-accent/50 bg-card p-4 text-sm" aria-label="Como funciona a jornada">
              <p className="font-bold">Bem-vindo à sua jornada</p>
              <ul className="list-disc space-y-1 pl-5 text-fg-muted">
                <li>Cada medalha da trilha é um acontecimento real do seu treino.</li>
                <li>O marcador <span className="font-semibold text-accent">Você está aqui</span> mostra onde você está agora.</li>
                <li>Toque numa medalha para ver o que ela significa e por que importa.</li>
                {prox ? <li>Sua próxima conquista possível: <span className="font-semibold text-fg">{prox.titulo}</span>.</li> : null}
              </ul>
              <button type="button" onClick={fecharIntro} className="touch rounded-lg bg-accent px-4 text-sm font-bold text-bg">Entendi</button>
            </section>
          ) : null}

          {prox ? (
            <section className="flex items-center gap-3 rounded-xl border border-accent/40 bg-card p-3" aria-label="Próxima conquista">
              <MedalhaIcone selo={prox.selo} conquistada={false} atual={prox.atual} alvo={prox.alvo} tamanho={52} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Próxima conquista</p>
                <p className="font-bold leading-tight">{prox.titulo}</p>
                {prox.falta ? <p className="text-xs text-fg-muted">{prox.falta}</p> : null}
              </div>
              <button type="button" onClick={() => aqui.current?.scrollIntoView({ behavior: "smooth", block: "center" })} className="alvo shrink-0 text-xs font-semibold text-accent underline-offset-2 hover:underline">Ver no mapa</button>
            </section>
          ) : null}

          <div className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-2xl" aria-label="Mapa da jornada">
            {jornada.capitulos.map((cap) => {
              const altura = TOPO + cap.nos.length * PASSO + 40;
              const pts = cap.nos.map((n, i) => ({ n, x: xDoNo(i), y: TOPO + i * PASSO + 40 }));
              const caminho = [`M180 0`, ...pts.map((p, i) => { const ant = i ? pts[i - 1] : { x: 180, y: 0 }; const meio = (ant.y + p.y) / 2; return `C${ant.x} ${meio} ${p.x} ${meio} ${p.x} ${p.y}`; }), `C${pts.at(-1)!.x} ${altura - 20} 180 ${altura - 30} 180 ${altura}`].join(" ");
              const alcancadosAqui = pts.filter((p) => (indice.get(p.n.id) ?? 0) < jornada.posicao);
              const yOuro = jornada.posicao >= (indice.get(cap.nos.at(-1)!.id) ?? 0) + 1 ? altura : alcancadosAqui.length ? alcancadosAqui.at(-1)!.y : 0;
              const aceso = cap.alcancados > 0 || (indice.get(cap.nos[0].id) ?? 0) <= jornada.posicao;
              const posLocal = pts.findIndex((p) => indice.get(p.n.id) === jornada.posicao);
              const aquiNoFim = cap.numero === ultimoCap && jornada.posicao >= jornada.nos.length;
              return (
                <section key={cap.numero} className="relative" style={{ height: altura }} aria-label={`Capítulo ${cap.numero}: ${cap.titulo}`}>
                  <Cenario tipo={cap.cenario} aceso={aceso} />
                  <svg viewBox={`0 0 360 ${altura}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                    <defs>
                      <clipPath id={`ouro-${cap.numero}`}><rect x="0" y="0" width="360" height={yOuro} /></clipPath>
                    </defs>
                    <path d={caminho} fill="none" stroke="#3a3a3a" strokeWidth="10" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.8" />
                    <path d={caminho} fill="none" stroke="#6b6b6b" strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    <path d={caminho} fill="none" stroke="#ba9e50" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" clipPath={`url(#ouro-${cap.numero})`} />
                  </svg>
                  <div className="absolute inset-x-0 top-3 mx-auto w-fit rounded-full border border-accent/40 bg-bg/85 px-4 py-1.5 text-center backdrop-blur-sm">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{cap.numero <= 4 ? `Capítulo ${cap.numero}` : "Depois do capítulo 4"}</p>
                    <p className="text-sm font-bold leading-tight">{cap.titulo}</p>
                    <p className="text-[10px] text-fg-muted">{cap.numero === 1 && semTreinos ? "Os marcos se preenchem conforme seus treinos registrados." : `${cap.subtitulo} ${cap.alcancados}/${cap.total}`}</p>
                  </div>
                  {pts.map((p, i) => (
                    <No key={p.n.id} no={p.n} x={p.x} y={p.y} lado={i % 2 === 0 ? "dir" : "esq"} onAbrir={() => setAberto(p.n)} />
                  ))}
                  {posLocal >= 0 || (cap.numero === 1 && jornada.posicao === 0) ? (
                    <Aqui ref={aqui} x={posLocal >= 0 ? pts[posLocal].x : 180} y={posLocal >= 0 ? pts[posLocal].y - 66 : TOPO - 6} />
                  ) : aquiNoFim ? (
                    <Aqui ref={aqui} x={180} y={altura - 64} />
                  ) : null}
                </section>
              );
            })}
          </div>
          <p className="text-center text-[11px] text-fg-subtle">Os capítulos organizam a jornada; nenhuma medalha depende de outra. Cada uma sai seguindo o seu plano, sem treinar além do prescrito.</p>
        </>
      ) : (
        <LinhaDoTempo eventos={eventos} />
      )}

      {modo === "treinador" && alunoId ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/treinador/conquistas?aluno=${alunoId}`} className="touch inline-flex items-center rounded-lg bg-accent px-4 text-sm font-bold text-bg">Enviar reconhecimento</Link>
          <Link href={`/treinador/alunos/${alunoId}`} className="touch inline-flex items-center rounded-lg border border-border px-4 text-sm font-semibold text-fg-muted hover:text-fg">Perfil e evolução</Link>
        </div>
      ) : null}

      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setAberto(null)}>
          <div role="dialog" aria-modal="true" aria-label="Detalhe do marco" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-bg p-3 motion-safe:animate-[jornadaSobe_220ms_ease-out] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            {aberto.tipo === "medalha" ? (
              <DetalheMedalha m={aberto.medalha} reconhecimento={reconhecimentos[aberto.medalha.codigo] ?? null} onFechar={() => setAberto(null)} rotuloEntender="Entenda a ciência dessa conquista" rotuloCard="Compartilhar conquista" onGerarCard={aberto.medalha.conquistada && modo === "aluno" ? () => setEditor(cardDaMedalha(aberto.medalha)) : undefined} />
            ) : (
              <DetalheMarco no={aberto} onFechar={() => setAberto(null)} />
            )}
          </div>
        </div>
      ) : null}
      {editor ? <EditorCard dados={editor.dados} modeloInicial={editor.modelo} nome={nome} origem="historico" onFechar={() => setEditor(null)} /> : null}
    </div>
  );
}

function No({ no, x, y, lado, onAbrir }: { no: NoJornada; x: number; y: number; lado: "dir" | "esq"; onAbrir: () => void }) {
  const titulo = no.tipo === "medalha" ? no.medalha.titulo : no.titulo;
  const status =
    no.tipo === "medalha"
      ? no.medalha.conquistada && no.medalha.data
        ? fmt.format(new Date(no.medalha.data))
        : no.medalha.alvo
          ? `${no.medalha.atual ?? 0}/${no.medalha.alvo}`
          : no.medalha.disponivel ? "a conquistar" : "momento próprio"
      : no.tipo === "recorrente"
        ? no.total ? `${no.total}× · última ${fmt.format(new Date(no.ultima!)).slice(0, 5)}` : "acontece ao longo do caminho"
        : no.data ? fmt.format(new Date(`${no.data}T15:00:00Z`)) : "próximo marco";
  return (
    <div className="absolute" style={{ left: `${(x / 360) * 100}%`, top: y, transform: "translate(-50%, -50%)" }}>
      <button type="button" onClick={onAbrir} aria-label={`${titulo}: ${no.alcancado ? "conquistado" : "ainda não"} — ${status}`} className={`relative block rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${no.alcancado ? "motion-safe:animate-[jornadaBrilho_2.4s_ease-in-out_1]" : ""}`}>
        {no.alcancado ? <span className="absolute inset-0 -m-2 rounded-full bg-accent/25 blur-md" aria-hidden /> : null}
        {no.proxima ? <span className="absolute inset-0 -m-1.5 rounded-full border-2 border-accent/70 motion-safe:animate-pulse" aria-hidden /> : null}
        {no.tipo === "medalha" ? (
          <MedalhaIcone selo={no.medalha.selo} conquistada={no.medalha.conquistada} atual={no.medalha.atual} alvo={no.medalha.alvo} tamanho={64} />
        ) : no.tipo === "recorrente" ? (
          <MedalhaIcone selo={no.codigo === "recorde" ? "Rec" : "↺"} conquistada={no.alcancado} atual={null} alvo={null} tamanho={56} />
        ) : (
          <Bandeira acesa={no.alcancado} />
        )}
      </button>
      <div className={`pointer-events-none absolute top-1/2 w-28 -translate-y-1/2 ${lado === "dir" ? "left-full ml-2 text-left" : "right-full mr-2 text-right"}`}>
        <p className={`text-[11px] font-bold leading-tight [text-shadow:0_1px_3px_#000] ${no.alcancado ? "text-fg" : "text-fg-muted"}`}>{titulo}</p>
        <p className="text-[10px] text-fg-subtle [text-shadow:0_1px_3px_#000]">{status}</p>
      </div>
    </div>
  );
}

function Bandeira({ acesa }: { acesa: boolean }) {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden>
      <circle cx="26" cy="26" r="24" fill="#141414" stroke={acesa ? "#ba9e50" : "#2e2e2e"} strokeWidth="3" />
      <line x1="19" y1="38" x2="19" y2="13" stroke={acesa ? "#e3cd8a" : "#777"} strokeWidth="2.5" />
      <path d="M19 13 L36 18 L19 24 Z" fill={acesa ? "#ba9e50" : "#555"} />
    </svg>
  );
}

const Aqui = ({ ref, x, y }: { ref: React.Ref<HTMLDivElement>; x: number; y: number }) => (
  <div ref={ref} className="pointer-events-none absolute z-10 flex flex-col items-center" style={{ left: `${(x / 360) * 100}%`, top: y, transform: "translateX(-50%)" }} aria-label="Você está aqui" role="img">
    <span className="whitespace-nowrap rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-bg shadow-lg">Você está aqui</span>
    <span className="mt-0.5 h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-accent" aria-hidden />
  </div>
);

function DetalheMarco({ no, onFechar }: { no: Exclude<NoJornada, { tipo: "medalha" }>; onFechar: () => void }) {
  const t = no.tipo === "recorrente" ? CONTEUDO[no.codigo] : null;
  return (
    <section className="space-y-3 rounded-xl border border-accent/40 bg-card p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{no.tipo === "recorrente" ? "Conquista que se repete" : "Marco de acompanhamento"}</p>
          <p className="text-base font-bold">{no.titulo}</p>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo text-fg-muted hover:text-fg">✕</button>
      </div>
      {t && no.tipo === "recorrente" ? (
        <>
          <p className="font-semibold">{no.total ? `${no.total} ${no.total === 1 ? "vez" : "vezes"} até agora${no.ultima ? ` · a última em ${fmt.format(new Date(no.ultima))}` : ""}.` : t.comoConquistar}</p>
          <p className="text-fg-muted">{t.importancia}</p>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-accent">Entenda a ciência dessa conquista</summary>
            <p className="mt-1 text-fg-muted">{t.explicacao}</p>
            <p className="mt-1 text-fg-muted"><span className="font-semibold text-fg">Próximo passo: </span>{t.proximoPasso}</p>
          </details>
          <Link href="/aluno/conquistas/todas" className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Ver o histórico completo</Link>
        </>
      ) : no.tipo === "ciclo" ? (
        <p className="text-fg-muted">{no.alcancado ? `Você completou ${no.titulo.toLowerCase()} em ${fmt.format(new Date(`${no.data}T15:00:00Z`))}. Um bom momento para olhar sua evolução com o Montinho e planejar o próximo ciclo.` : "Um marco de tempo de acompanhamento (semanas em pausa combinada não contam). A jornada continua depois dele, um ciclo de cada vez."}</p>
      ) : null}
    </section>
  );
}

function LinhaDoTempo({ eventos }: { eventos: EventoJornada[] }) {
  if (!eventos.length) return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Seus acontecimentos aparecem aqui a partir do primeiro treino registrado.</div>;
  const grupos = new Map<string, EventoJornada[]>();
  for (const e of eventos) {
    const k = fmtMes.format(new Date(e.data));
    grupos.set(k, [...(grupos.get(k) ?? []), e]);
  }
  const ICONE: Record<EventoJornada["tipo"], string> = { medalha: "🏅", recorde: "📈", retomada: "↺", meta: "✓", reconhecimento: "✉", ciclo: "⚑", descoberta: "💡" };
  return (
    <div className="space-y-4">
      {[...grupos.entries()].map(([mes, evs]) => (
        <section key={mes} aria-label={mes}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-fg-muted">{mes}</h2>
          <ol className="relative space-y-2 border-l border-accent/30 pl-4">
            {evs.map((e) => (
              <li key={e.chave} className="relative">
                <span className="absolute -left-[25px] top-2 flex h-4 w-4 items-center justify-center rounded-full bg-bg text-[10px]" aria-hidden>{ICONE[e.tipo]}</span>
                <details className="rounded-lg border border-border bg-card px-3 py-2">
                  <summary className="flex cursor-pointer items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold">{e.titulo}</span>
                    <time className="shrink-0 text-[11px] text-fg-subtle" dateTime={e.data}>{fmt.format(new Date(e.data))}</time>
                  </summary>
                  {e.detalhe ? <p className="mt-1 text-sm text-fg-muted">{e.autor === "personal" ? `“${e.detalhe}”` : e.detalhe}</p> : null}
                  <p className="mt-1 text-[10px] text-fg-subtle">{e.autor === "personal" ? "Escrita pelo seu personal" : "Registro automático do app"}</p>
                </details>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
