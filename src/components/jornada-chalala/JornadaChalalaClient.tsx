"use client";

// ============================================================================
// Protótipo navegável de “A Jornada do Chalalá” (aprovação). Dados FICTÍCIOS,
// identificados na tela. Controles da demonstração: cenário (rotina regular /
// com pausa e retorno), movimento (automático / reduzido = versão estática),
// simular nova medalha e as abas Mapa · Minha História · Personagens.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { DetalheMedalha } from "@/components/conquistas/DetalheMedalha";
import { CONTEUDO } from "@/lib/conquistas/conteudo";
import type { NoJornada } from "@/lib/conquistas/jornada";
import type { DadosChalala } from "@/lib/jornada-chalala/demo";
import { CAPITULOS_CHALALA, FALAS_CHALALA, PALETA_CHALALA, PERSONAGENS_CHALALA, personagemPorId, type PersonagemChalala } from "@/lib/jornada-chalala/universo";
import { CaminhoChalala } from "./CaminhoChalala";
import { MapaChalala, useMovimentoPermitido } from "./MapaChalala";
import { MinhaHistoria } from "./MinhaHistoria";
import { Personagem, PersonagemBotao } from "./Personagens";

type Cenario = "completo" | "retorno";
type Aba = "mapa" | "historia" | "personagens";
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

export function JornadaChalalaClient({ dados }: { dados: Record<Cenario, DadosChalala> }) {
  const [cenario, setCenario] = useState<Cenario>("completo");
  const [aba, setAba] = useState<Aba>("mapa");
  const [forcarReduzido, setForcarReduzido] = useState(false);
  const [aberto, setAberto] = useState<NoJornada | null>(null);
  const [revelar, setRevelar] = useState<string | null>(null);
  const [personagem, setPersonagem] = useState<PersonagemChalala["id"] | null>(null);
  const sistemaPermite = useMovimentoPermitido();
  const movimento = !sistemaPermite || forcarReduzido ? "reduzido" : "auto";
  const d = dados[cenario];

  // Simulação: “revela” de novo a medalha conquistada mais recente (animação + Colombo). Nada é gravado.
  const ultimaMedalha = useMemo(() => {
    const ganhas = d.jornada.nos.filter((n): n is Extract<NoJornada, { tipo: "medalha" }> => n.tipo === "medalha" && n.alcancado && !!n.medalha.data);
    return ganhas.sort((a, b) => (a.medalha.data! < b.medalha.data! ? 1 : -1))[0] ?? null;
  }, [d]);
  useEffect(() => {
    if (!revelar) return;
    const t = setTimeout(() => setRevelar(null), 4200);
    return () => clearTimeout(t);
  }, [revelar]);

  return (
    <div data-movimento={movimento} className="mx-auto w-full max-w-md space-y-4 px-4 pb-16 text-fg">
      {/* Identificação do protótipo */}
      <div className="rounded-2xl border border-warning/60 bg-warning/10 p-3 text-xs">
        <p className="font-black uppercase tracking-wider text-warning">Protótipo para aprovação · dados fictícios</p>
        <p className="text-fg-muted">Esta não é a tela dos alunos. “{d.nome}” e o histórico abaixo são inventados; só a lógica das medalhas é a real.</p>
      </div>

      <header className="space-y-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Montinho Personal Trainer</p>
          <h1 className="text-3xl font-black leading-none">A Jornada do Chalalá</h1>
          <p className="mt-1 text-sm italic text-fg-muted">“{FALAS_CHALALA.lema}”</p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            [d.semanas, "semanas de caminhada"],
            [d.treinos, "treinos concluídos"],
            [d.conquistas.filter((c) => c.codigo !== "recorde").length, "medalhas"],
          ].map(([v, r]) => (
            <div key={String(r)} className="rounded-2xl border border-border bg-[#171B21] p-2">
              <dt className="text-[10px] text-fg-muted">{r}</dt>
              <dd className="font-mono text-xl font-black">{v}</dd>
            </div>
          ))}
        </dl>

        {/* Controles da demonstração */}
        <details className="rounded-2xl border border-border bg-[#171B21] p-3 text-xs" open>
          <summary className="cursor-pointer font-bold">Controles da demonstração</summary>
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-fg-muted">Cenário:</span>
              {(["completo", "retorno"] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCenario(c)} aria-pressed={cenario === c} className={`rounded-full border px-3 py-1 font-semibold ${cenario === c ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                  {c === "completo" ? "Rotina regular" : "Com pausa e retorno"}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-fg-muted">Movimento:</span>
              <button type="button" onClick={() => setForcarReduzido(false)} aria-pressed={movimento === "auto"} disabled={!sistemaPermite} className={`rounded-full border px-3 py-1 font-semibold disabled:opacity-40 ${movimento === "auto" ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>Automático</button>
              <button type="button" onClick={() => setForcarReduzido(true)} aria-pressed={movimento === "reduzido"} className={`rounded-full border px-3 py-1 font-semibold ${movimento === "reduzido" ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>Reduzido (estático)</button>
              {!sistemaPermite ? <span className="text-fg-subtle">seu aparelho pede movimento reduzido</span> : null}
            </div>
            <button
              type="button"
              disabled={!ultimaMedalha || aba !== "mapa"}
              onClick={() => ultimaMedalha && setRevelar(ultimaMedalha.id)}
              className="touch rounded-xl bg-accent px-4 text-sm font-bold text-bg disabled:opacity-40"
            >
              ✦ Simular nova medalha{ultimaMedalha ? ` (${ultimaMedalha.medalha.titulo})` : ""}
            </button>
          </div>
        </details>

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
          {d.jornada.proxima ? (
            <section className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-[#171B21] p-3" aria-label="Próxima conquista">
              <PersonagemBotao id="colombo" tamanho={52} onAbrir={setPersonagem} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Próxima conquista</p>
                <p className="font-bold leading-tight">{d.jornada.proxima.titulo}</p>
                {d.jornada.proxima.falta ? <p className="text-xs text-fg-muted">{d.jornada.proxima.falta}</p> : null}
              </div>
            </section>
          ) : null}
          {d.jornada.caminho ? <CaminhoChalala caminho={d.jornada.caminho} onAbrirPersonagem={setPersonagem} /> : null}
          <MapaChalala jornada={d.jornada} movimento={movimento} revelar={revelar} onAbrir={setAberto} onAbrirPersonagem={setPersonagem} />
          <p className="text-center text-[11px] text-fg-subtle">Os capítulos organizam a história; nenhuma medalha depende de outra. Cada uma sai seguindo o seu plano, sem treinar além do prescrito.</p>
        </>
      ) : aba === "historia" ? (
        <MinhaHistoria eventos={d.eventos} nome={d.nome} onAbrirPersonagem={setPersonagem} />
      ) : (
        <Personagens onAbrirPersonagem={setPersonagem} />
      )}

      {personagem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setPersonagem(null)}>
          <div role="dialog" aria-modal="true" aria-label={`Sobre ${personagemPorId(personagem).nome}`} className="w-full max-w-md rounded-t-3xl bg-bg p-4 chalala-fala sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <DetalhePersonagem p={personagemPorId(personagem)} onFechar={() => setPersonagem(null)} />
          </div>
        </div>
      ) : null}
      {aberto ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={() => setAberto(null)}>
          <div role="dialog" aria-modal="true" aria-label="Detalhe do marco" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-3 chalala-fala sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            {aberto.tipo === "medalha" ? (
              <DetalheMedalha m={aberto.medalha} onFechar={() => setAberto(null)} rotuloEntender="Entenda a ciência dessa conquista" rotuloCard="Compartilhar conquista" />
            ) : (
              <DetalheMarco no={aberto} onFechar={() => setAberto(null)} />
            )}
          </div>
        </div>
      ) : null}
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

function DetalheMarco({ no, onFechar }: { no: Exclude<NoJornada, { tipo: "medalha" }>; onFechar: () => void }) {
  const t = no.tipo === "recorrente" ? CONTEUDO[no.codigo] : null;
  return (
    <div className="space-y-3 p-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{no.tipo === "recorrente" ? "Conquista que se repete" : "Marco de acompanhamento"}</p>
          <h2 className="text-lg font-black">{no.titulo}</h2>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="grid h-9 w-9 place-items-center rounded-full border border-border text-fg-muted">✕</button>
      </div>
      {t && no.tipo === "recorrente" ? (
        <>
          <p className="text-fg-muted">{t.resumo}</p>
          <p>{no.total ? `Aconteceu ${no.total} ${no.total === 1 ? "vez" : "vezes"}; a última em ${fmt.format(new Date(no.ultima!))}.` : "Ainda não aconteceu. Quando acontecer, aparece aqui e no diário."}</p>
          <p className="text-fg-muted">{t.importancia}</p>
        </>
      ) : no.tipo === "ciclo" ? (
        <p className="text-fg-muted">{no.alcancado ? `Você completou ${no.titulo.toLowerCase()} em ${fmt.format(new Date(`${no.data}T15:00:00Z`))}. Um bom momento para olhar sua evolução com o Montinho e planejar o próximo ciclo.` : "Um marco de tempo de acompanhamento (semanas em pausa combinada não contam). A jornada continua depois dele, um ciclo de cada vez."}</p>
      ) : null}
    </div>
  );
}

function Personagens({ onAbrirPersonagem }: { onAbrirPersonagem: (id: PersonagemChalala["id"]) => void }) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border bg-[#171B21] p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Direção de arte</p>
        <p className="mt-1 text-sm text-fg-muted">Ilustração 2.5D em camadas (céu, longe, meio, perto) com parallax leve ao rolar; montanhas estilizadas, luz suave e dourado só para progresso e pontos de interesse. Tipografia DM Sans.</p>
        <ul className="mt-3 grid grid-cols-5 gap-1.5">
          {Object.entries(PALETA_CHALALA).map(([nome, cor]) => (
            <li key={nome} className="text-center text-[10px] text-fg-muted">
              <span className="block h-9 rounded-xl border border-white/10" style={{ background: cor }} aria-hidden />
              {nome}
            </li>
          ))}
        </ul>
        <ol className="mt-3 space-y-1 text-xs text-fg-muted">
          {CAPITULOS_CHALALA.map((c) => (
            <li key={c.numero}><span className="font-bold text-fg">{c.numero}. {c.titulo}</span> · {c.lugar} · <span className="italic">{c.sensacao}</span></li>
          ))}
        </ol>
      </section>
      <p className="text-xs text-fg-muted">Propostas conceituais para aprovação. O aluno continua sendo o protagonista: no máximo um personagem por tela.</p>
      {PERSONAGENS_CHALALA.map((p) => (
        <section key={p.id} className="flex gap-3 rounded-3xl border border-border bg-[#171B21] p-4" aria-label={p.nome}>
          <PersonagemBotao id={p.id} tamanho={88} onAbrir={onAbrirPersonagem} />
          <div className="min-w-0 space-y-1 text-xs">
            <p className="text-base font-black leading-tight">{p.nome} <span className="text-sm font-semibold text-accent">· {p.papel}</span></p>
            <p className="rounded-2xl rounded-tl-sm border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[12px] font-semibold">“{p.fala}”</p>
            <p className="text-fg">{p.resumo}</p>
            <p><span className="font-bold">Personalidade:</span> {p.personalidade}</p>
            <p><span className="font-bold">Quando aparece:</span> {p.quando}</p>
            <p className="text-fg-muted"><span className="font-bold text-fg">Arte definitiva:</span> {p.arte}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
