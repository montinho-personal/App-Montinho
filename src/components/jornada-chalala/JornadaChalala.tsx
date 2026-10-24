"use client";

// ============================================================================
// “A Jornada do Chalalá” — tela definitiva de Minha Jornada (aluno e personal).
// Só exibe: medalhas, posição, caminho semanal e história vêm do motor oficial
// de conquistas, calculado no servidor (`dadosDaJornada`). Aqui nada é
// concedido nem gravado, exceto marcações locais deste aparelho (introdução
// vista, medalha já revelada, preferência de movimento).
// ============================================================================

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { DetalheMedalha } from "@/components/conquistas/DetalheMedalha";
import { cardDaMedalha } from "@/components/conquistas/VitrineMedalhas";
import { enviarEvento } from "@/components/chalala/evento";
import { CONTEUDO } from "@/lib/conquistas/conteudo";
import { MEDALHAS_DO_RITMO, type EventoJornada, type ItemParada, type Jornada, type NoJornada } from "@/lib/conquistas/jornada";
import type { DadosCard, ModeloId } from "@/lib/chalala/card";
import { FALAS_CHALALA, PERSONAGENS_CHALALA, personagemPorId, type PersonagemChalala } from "@/lib/jornada-chalala/universo";
import { CaminhoChalala } from "./CaminhoChalala";
import { MapaChalala, useMovimentoPermitido } from "./MapaChalala";
import { MinhaHistoria } from "./MinhaHistoria";
import { Personagem, PersonagemBotao } from "./Personagens";

const EditorCard = dynamic(() => import("@/components/chalala/EditorCard"), { ssr: false });
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const INTRO = "montinho-jornada-chalala-intro-v1";
const MOVIMENTO = "montinho-jornada-chalala-movimento";
const REVELADA = "montinho-jornada-chalala-revelada";

type Aba = "mapa" | "historia" | "personagens";
type Stats = { semanas: number; treinos: number; aderencia: number | null; album?: { explorados: number; total: number } };
type Props = {
  jornada: Jornada;
  eventos: EventoJornada[];
  stats: Stats;
  nome: string;
  modo?: "aluno" | "treinador";
  alunoId?: string;
  reconhecimentos?: Record<string, { mensagem: string; data: string }>;
  semTreinos?: boolean;
};

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento local: segue sem lembrar */
  }
};

export function JornadaChalala({ jornada, eventos, stats, nome, modo = "aluno", alunoId, reconhecimentos = {}, semTreinos = false }: Props) {
  const [aba, setAba] = useState<Aba>("mapa");
  const [aberto, setAberto] = useState<NoJornada | null>(null);
  const [parada, setParada] = useState<ItemParada | null>(null);
  const [personagem, setPersonagem] = useState<PersonagemChalala["id"] | null>(null);
  const [editor, setEditor] = useState<{ dados: DadosCard; modelo: ModeloId; ref?: string } | null>(null);
  const [introFechada, setIntroFechada] = useState(false);
  const [reduzirManual, setReduzirManual] = useState<boolean | null>(null);
  const [revelar, setRevelar] = useState<string | null>(null);
  const sistemaPermite = useMovimentoPermitido();

  // Introdução só no primeiro acesso deste aparelho (no servidor: nunca).
  const introVista = useSyncExternalStore(() => () => undefined, () => !!ler(INTRO), () => true);
  const intro = modo === "aluno" && !introVista && !introFechada;
  // Preferência de movimento deste aparelho (no servidor: automático).
  const reduzirSalvo = useSyncExternalStore(() => () => undefined, () => ler(MOVIMENTO) === "reduzido", () => false);
  const reduzir = reduzirManual ?? reduzirSalvo;
  const movimento = !sistemaPermite || reduzir ? "reduzido" : "auto";

  useEffect(() => {
    if (modo !== "aluno") return;
    enviarEvento({ tipo: "vitrine_vista", origem: "vitrine" });
  }, [modo]);

  // Medalha nova (até 7 dias) ainda não revelada neste aparelho: Colombo comemora uma vez.
  const medalhaNova = useMemo(() => {
    const novas = jornada.nos.filter((n): n is Extract<NoJornada, { tipo: "medalha" }> => n.tipo === "medalha" && n.medalha.nova && !!n.medalha.data);
    return novas.sort((a, b) => (a.medalha.data! < b.medalha.data! ? 1 : -1))[0] ?? null;
  }, [jornada.nos]);
  useEffect(() => {
    if (modo !== "aluno" || !medalhaNova || aba !== "mapa") return;
    const chave = `${REVELADA}:${medalhaNova.id}:${medalhaNova.medalha.data}`;
    if (ler(chave)) return;
    const t = setTimeout(() => {
      gravar(chave, "1");
      setRevelar(medalhaNova.id);
    }, 900);
    return () => clearTimeout(t);
  }, [modo, medalhaNova, aba]);
  useEffect(() => {
    if (!revelar) return;
    const t = setTimeout(() => setRevelar(null), 4200);
    return () => clearTimeout(t);
  }, [revelar]);

  useEffect(() => {
    if (!aberto && !personagem && !parada) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAberto(null);
      setParada(null);
      setPersonagem(null);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, personagem, parada]);

  function fecharIntro() {
    setIntroFechada(true);
    gravar(INTRO, "1");
  }
  function alternarMovimento() {
    const novo = !reduzir;
    setReduzirManual(novo);
    gravar(MOVIMENTO, novo ? "reduzido" : "auto");
  }

  const prox = jornada.proxima;

  return (
    <div data-movimento={movimento} className="space-y-4">
      <header className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">{modo === "aluno" ? "Montinho Personal Trainer" : `Jornada de ${nome}`}</p>
          <h1 className="text-3xl font-black leading-none">A Jornada do Chalalá</h1>
          <p className="mt-1 text-sm italic text-fg-muted">“{FALAS_CHALALA.lema}”</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Semanas de caminhada", String(stats.semanas)],
            ["Treinos concluídos", String(stats.treinos)],
            ["Aderência (4 semanas)", stats.aderencia != null ? `${stats.aderencia}%` : "—"],
          ].map(([r, v]) => (
            <div key={r} className="rounded-2xl border border-border bg-[#171B21] px-2 py-2">
              <dd className="font-mono text-xl font-black">{v}</dd>
              <dt className="text-[10px] leading-tight text-fg-subtle">{r}</dt>
            </div>
          ))}
        </dl>
        {stats.album ? (
          modo === "aluno" ? (
            <Link href="/aluno/descobertas" className="flex items-center justify-between rounded-2xl border border-border bg-[#171B21] px-3 py-2 text-sm hover:border-accent/40">
              <span><span aria-hidden>💡 </span>Montinho Desbloqueia: <strong>{stats.album.explorados} de {stats.album.total}</strong> descobertas</span>
              <span aria-hidden className="text-accent">→</span>
            </Link>
          ) : (
            <p className="rounded-2xl border border-border bg-[#171B21] px-3 py-2 text-sm"><span aria-hidden>💡 </span>Montinho Desbloqueia: <strong>{stats.album.explorados} de {stats.album.total}</strong> descobertas exploradas</p>
          )
        ) : null}
        <div role="tablist" aria-label="Partes da jornada" className="grid grid-cols-3 gap-1 rounded-2xl border border-border bg-[#171B21] p-1">
          {([["mapa", "Mapa"], ["historia", "Minha História"], ["personagens", "Personagens"]] as const).map(([k, r]) => (
            <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)} className={`touch rounded-xl text-sm font-semibold ${aba === k ? "bg-accent text-bg" : "text-fg-muted hover:text-fg"}`}>
              {r}
            </button>
          ))}
        </div>
      </header>

      {aba === "mapa" ? (
        <>
          {intro ? (
            <section className="space-y-2 rounded-2xl border border-accent/50 bg-[#171B21] p-4 text-sm" aria-label="Como funciona a jornada">
              <div className="flex items-end gap-2">
                <PersonagemBotao id="montinho" tamanho={56} onAbrir={setPersonagem} />
                <p className="rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/10 px-3 py-2 font-semibold">{FALAS_CHALALA.primeiroTreino}</p>
              </div>
              <ul className="list-disc space-y-1 pl-5 text-fg-muted">
                <li>A estrada mostra as medalhas do caminho. As paradas 🎁 ao lado são bônus: nunca seguram ninguém.</li>
                <li>Você muda de capítulo com 10, 25 e 50 treinos (ou 12 semanas) e aos 6 meses de acompanhamento.</li>
                <li>O marcador <span className="font-semibold text-accent">Você está aqui</span> mostra onde você está agora.</li>
                <li>Toque numa medalha para ver o que ela significa. Toque num personagem para conhecê-lo.</li>
                {prox ? <li>Sua próxima conquista possível: <span className="font-semibold text-fg">{prox.titulo}</span>.</li> : null}
              </ul>
              <button type="button" onClick={fecharIntro} className="touch rounded-xl bg-accent px-4 text-sm font-bold text-bg">Entendi</button>
            </section>
          ) : null}

          {prox ? (
            <section className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-[#171B21] p-3" aria-label="Próxima conquista">
              <PersonagemBotao id="colombo" tamanho={52} onAbrir={setPersonagem} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Próxima conquista</p>
                <p className="font-bold leading-tight">{prox.titulo}</p>
                {prox.falta ? <p className="text-xs text-fg-muted">{prox.falta}</p> : null}
              </div>
            </section>
          ) : null}

          {jornada.missoesEmAberto.length ? (
            <section className="space-y-2 rounded-2xl border border-[#C18B61]/50 bg-[#171B21] p-3" aria-label="Missões em aberto">
              <div className="flex items-center gap-3">
                <PersonagemBotao id="fenix" tamanho={52} onAbrir={setPersonagem} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#C18B61]">Missões em aberto</p>
                  <p className="text-xs text-fg-muted">Ficaram para trás na estrada, mas ainda dá tempo. Seu caminho continua aqui.</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {jornada.missoesEmAberto.map((m) => (
                  <li key={m.codigo}>
                    <button type="button" onClick={() => setParada({ codigo: m.codigo, titulo: m.titulo, total: 0, data: "", medalha: m })} className="flex w-full items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:border-accent/50">
                      <span className="min-w-0"><span className="block font-semibold">{m.titulo}</span>{m.falta ? <span className="block text-xs text-fg-muted">{m.falta}</span> : null}</span>
                      <span aria-hidden className="text-accent">→</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {jornada.caminho ? <CaminhoChalala caminho={jornada.caminho} onAbrirPersonagem={setPersonagem} /> : null}
          <MapaChalala jornada={jornada} movimento={movimento} revelar={revelar} onAbrir={setAberto} onAbrirParada={setParada} onAbrirPersonagem={setPersonagem} semTreinos={semTreinos} rolarAteAqui />
          <div className="flex flex-col items-center gap-1 text-center text-[11px] text-fg-subtle">
            <p>A estrada mostra as medalhas do caminho, na ordem em que você conquista. As paradas 🎁 são bônus e nunca seguram ninguém. Cada medalha sai seguindo o seu plano, sem treinar além do prescrito.</p>
            {sistemaPermite ? (
              <button type="button" onClick={alternarMovimento} aria-pressed={reduzir} className="alvo font-semibold text-fg-muted underline-offset-2 hover:underline">
                {reduzir ? "Ligar movimento do mapa" : "Reduzir movimento do mapa"}
              </button>
            ) : null}
          </div>
        </>
      ) : aba === "historia" ? (
        <MinhaHistoria eventos={eventos} nome={nome} onAbrirPersonagem={setPersonagem} />
      ) : (
        <Personagens onAbrirPersonagem={setPersonagem} />
      )}

      {modo === "treinador" && alunoId ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/treinador/conquistas?aluno=${alunoId}`} className="touch inline-flex items-center rounded-xl bg-accent px-4 text-sm font-bold text-bg">Enviar reconhecimento</Link>
          <Link href={`/treinador/alunos/${alunoId}`} className="touch inline-flex items-center rounded-xl border border-border px-4 text-sm font-semibold text-fg-muted hover:text-fg">Perfil e evolução</Link>
        </div>
      ) : null}

      {personagem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setPersonagem(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Sobre ${personagemPorId(personagem).nome}`} className="w-full max-w-md rounded-t-3xl bg-bg p-4 chalala-fala sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <DetalhePersonagem p={personagemPorId(personagem)} onFechar={() => setPersonagem(null)} />
          </div>
        </div>
      ) : null}
      {aberto || parada ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => { setAberto(null); setParada(null); }}>
          <div role="dialog" aria-modal="true" aria-label="Detalhe do marco" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-3 chalala-fala sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const fechar = () => { setAberto(null); setParada(null); };
              const m = aberto?.tipo === "medalha" ? aberto.medalha : parada?.medalha ?? null;
              if (m) {
                return (
                  <>
                    {MEDALHAS_DO_RITMO.has(m.codigo) ? (
                      <div className="mb-2 flex items-end gap-2 px-1">
                        <PersonagemBotao id="oogway" tamanho={48} onAbrir={setPersonagem} />
                        <p className="rounded-2xl rounded-bl-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold">“{personagemPorId("oogway").fala}”</p>
                      </div>
                    ) : null}
                    <DetalheMedalha m={m} reconhecimento={reconhecimentos[m.codigo] ?? null} onFechar={fechar} rotuloEntender="Entenda a ciência dessa conquista" rotuloCard="Compartilhar conquista" onGerarCard={m.conquistada && modo === "aluno" ? () => setEditor(cardDaMedalha(m)) : undefined} />
                  </>
                );
              }
              if (parada) return <DetalheRecorrente item={parada} onFechar={fechar} />;
              if (aberto && aberto.tipo === "ciclo") return <DetalheMarco no={aberto} onFechar={fechar} />;
              return null;
            })()}
          </div>
        </div>
      ) : null}
      {editor ? <EditorCard dados={editor.dados} modeloInicial={editor.modelo} nome={nome} origem="historico" refEvento={editor.ref ?? null} onFechar={() => setEditor(null)} /> : null}
    </div>
  );
}

function DetalhePersonagem({ p, onFechar }: { p: PersonagemChalala; onFechar: () => void }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)]"><Personagem id={p.id} tamanho={88} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">{p.papel}</p>
          <h2 className="text-2xl font-black leading-tight">{p.nome}</h2>
          <p className="mt-1 text-fg-muted">{p.resumo}</p>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-fg-muted">✕</button>
      </div>
      <p className="rounded-2xl rounded-tl-sm border border-accent/40 bg-accent/10 px-3 py-2 font-semibold">“{p.fala}”</p>
      <p className="text-xs text-fg-muted"><span className="font-bold text-fg">Quando aparece:</span> {p.quando}</p>
    </div>
  );
}

function DetalheMarco({ no, onFechar }: { no: Extract<NoJornada, { tipo: "ciclo" }>; onFechar: () => void }) {
  return (
    <div className="space-y-3 p-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Marco de acompanhamento</p>
          <h2 className="text-lg font-black">{no.titulo}</h2>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full border border-border text-fg-muted">✕</button>
      </div>
      <p className="text-fg-muted">{no.alcancado ? `Você completou ${no.titulo.toLowerCase()} em ${fmt.format(new Date(`${no.data}T15:00:00Z`))}. Um bom momento para olhar sua evolução com o Montinho e planejar o próximo ciclo.` : "Um marco de tempo de acompanhamento (semanas em pausa combinada não contam). A jornada continua depois dele, um ciclo de cada vez."}</p>
    </div>
  );
}

/** Parada 🎁 de recorde ou retomada (conquistas que se repetem). */
function DetalheRecorrente({ item, onFechar }: { item: ItemParada; onFechar: () => void }) {
  const t = item.codigo === "recorde" || item.codigo === "eu_voltei" ? CONTEUDO[item.codigo] : null;
  return (
    <div className="space-y-3 p-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Conquista que se repete</p>
          <h2 className="text-lg font-black">{item.titulo}</h2>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full border border-border text-fg-muted">✕</button>
      </div>
      {t ? (
        <>
          <p className="font-semibold">{item.total} {item.total === 1 ? "vez" : "vezes"} neste trecho da estrada · a primeira em {fmt.format(new Date(item.data))}.</p>
          <p className="text-fg-muted">{t.importancia}</p>
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-accent">Entenda a ciência dessa conquista</summary>
            <p className="mt-1 text-fg-muted">{t.explicacao}</p>
            <p className="mt-1 text-fg-muted"><span className="font-semibold text-fg">Próximo passo: </span>{t.proximoPasso}</p>
          </details>
          <Link href="/aluno/conquistas/todas" className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Ver o histórico completo</Link>
        </>
      ) : null}
    </div>
  );
}

function Personagens({ onAbrirPersonagem }: { onAbrirPersonagem: (id: PersonagemChalala["id"]) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">Quem acompanha você pelo caminho. Você continua sendo o protagonista: eles só aparecem em momentos certos, um de cada vez.</p>
      {PERSONAGENS_CHALALA.map((p) => (
        <section key={p.id} className="flex gap-3 rounded-3xl border border-border bg-[#171B21] p-4" aria-label={p.nome}>
          <PersonagemBotao id={p.id} tamanho={88} onAbrir={onAbrirPersonagem} />
          <div className="min-w-0 space-y-1 text-xs">
            <p className="text-base font-black leading-tight">{p.nome} <span className="text-sm font-semibold text-accent">· {p.papel}</span></p>
            <p className="rounded-2xl rounded-tl-sm border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[12px] font-semibold">“{p.fala}”</p>
            <p className="text-fg">{p.resumo}</p>
            <p className="text-fg-muted"><span className="font-bold text-fg">Quando aparece:</span> {p.quando}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
