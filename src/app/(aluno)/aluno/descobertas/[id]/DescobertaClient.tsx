"use client";

// Quiz → feedback imediato → níveis 1, 2 e 3 (divulgação progressiva).
// Errar não tira nada; responder não concede medalha.
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CATEGORIAS, type ConteudoConhecimento } from "@/lib/desbloqueia/tipos";
import { responder } from "@/lib/desbloqueia/motor";
import { enviarEvento } from "@/components/chalala/evento";
import { CardDescoberta } from "@/components/desbloqueia/CardDescoberta";

type Fonte = { id: string; citacao: string; link: string | null; nota: string | null };
type Origem = "conquista" | "periodo" | "personal" | "contexto" | "biblioteca";

async function postar(url: string, body: unknown) {
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    // offline: a leitura continua; o progresso fica para a próxima vez
  }
}

export function DescobertaClient({ conteudo: c, fontes, respostaAnterior, salvoInicial, origem }: { conteudo: ConteudoConhecimento; fontes: Fonte[]; respostaAnterior: string | null; salvoInicial: boolean; origem: Origem | null }) {
  const [resposta, setResposta] = useState<string | null>(respostaAnterior);
  const [nivel, setNivel] = useState<1 | 2 | 3>(1);
  const [salvo, setSalvo] = useState(salvoInicial);
  const [card, setCard] = useState(false);
  const [semQuiz, setSemQuiz] = useState(false);
  const registrado = useRef(false);
  const cat = CATEGORIAS.find((k) => k.id === c.categoria);
  const resultado = resposta ? responder(c, resposta) : null;
  const revelado = !!resultado || semQuiz;
  const origemEvento = origem === "contexto" ? "contexto" : origem === "biblioteca" ? "biblioteca" : origem === "personal" ? "personal" : "album";

  useEffect(() => enviarEvento({ tipo: "conhecimento_aberto", modelo: c.id, origem: origemEvento }), [c.id, origemEvento]);

  function explorar(alternativa: string | null) {
    if (registrado.current && !alternativa) return;
    registrado.current = true;
    void postar(`/api/conhecimento/${c.id}/explorar`, { resposta: alternativa, origem });
  }
  function escolher(id: string) {
    setResposta(id);
    enviarEvento({ tipo: "quiz_respondido", modelo: c.id, origem: origemEvento });
    explorar(id);
  }
  function lerDireto() {
    setSemQuiz(true);
    explorar(null);
  }
  function alternarSalvo() {
    const novo = !salvo;
    setSalvo(novo);
    if (novo) enviarEvento({ tipo: "descoberta_salva", modelo: c.id, origem: origemEvento });
    void postar(`/api/conhecimento/${c.id}/salvar`, { salvo: novo });
  }

  return (
    <article className="space-y-4">
      <header className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: cat?.cor }}>
          #{String(c.numero).padStart(2, "0")} · {cat?.rotulo}{c.essencial ? " · Orientação essencial" : ""}
        </p>
        <h1 className="text-xl font-bold leading-tight">{c.pergunta}</h1>
      </header>

      {!revelado ? (
        <section className="space-y-3" aria-label="Quiz">
          <p className="text-sm text-fg-muted">O que você acha?</p>
          <div className="grid gap-2">
            {c.alternativas.map((a) => (
              <button key={a.id} type="button" onClick={() => escolher(a.id)} className="alvo min-h-12 rounded-xl border border-border bg-card px-4 text-left text-base font-semibold hover:border-accent">
                {a.texto}
              </button>
            ))}
          </div>
          <button type="button" onClick={lerDireto} className="alvo text-sm text-fg-muted underline underline-offset-4 hover:text-fg">Ler sem responder</button>
        </section>
      ) : (
        <>
          {resultado ? (
            <section aria-live="polite" className={`space-y-1 rounded-xl border p-4 ${resultado.acertou ? "border-success/50 bg-success/10" : "border-accent/40 bg-accent-soft/40"}`}>
              <p className="text-base font-bold">{resultado.titulo}</p>
              <p className="text-sm">Resposta: <strong>{resultado.veredito}</strong>{!resultado.acertou ? ` · você respondeu “${c.alternativas.find((a) => a.id === resposta)?.texto}”` : ""}</p>
            </section>
          ) : (
            <p className="rounded-xl border border-border bg-card p-3 text-sm">Resposta: <strong>{c.veredito}</strong></p>
          )}

          <section className="space-y-2 rounded-xl border border-border bg-card p-4" aria-label="Resposta rápida">
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Resposta rápida</p>
            <p className="text-sm leading-relaxed">{c.rapida}</p>
            <p className="text-sm font-semibold">Na prática: <span className="font-normal">{c.pratica}</span></p>
          </section>

          {nivel >= 2 ? (
            <section className="space-y-2 rounded-xl border border-border bg-card p-4" aria-label="Entenda melhor">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Entenda melhor</p>
              <p className="text-sm leading-relaxed">{c.detalhada}</p>
              {c.exemplo ? <p className="rounded-lg bg-accent-soft/40 px-3 py-2 text-sm"><strong>Exemplo:</strong> {c.exemplo}</p> : null}
              {c.fatores.length ? (
                <div>
                  <p className="text-xs font-semibold text-fg-muted">O que mais influencia</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">{c.fatores.map((f) => <li key={f} className="rounded-full border border-border px-2.5 py-1 text-xs">{f}</li>)}</ul>
                </div>
              ) : null}
            </section>
          ) : null}

          {nivel >= 3 ? (
            <section className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm" aria-label="A ciência por trás">
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent">A ciência por trás</p>
              <p className="leading-relaxed">{c.ciencia}</p>
              {c.limitacoes ? <p><strong>Limitações:</strong> {c.limitacoes}</p> : null}
              {c.quandoMuda ? <p><strong>Quando a resposta muda:</strong> {c.quandoMuda}</p> : null}
              {fontes.length ? (
                <div>
                  <p className="text-xs font-semibold text-fg-muted">Fontes</p>
                  <ol className="mt-1 list-decimal space-y-1.5 pl-5 text-xs text-fg-muted">
                    {fontes.map((f) => (
                      <li key={f.id}>
                        {f.link ? <a href={f.link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-fg">{f.citacao}</a> : f.citacao}
                        {f.nota ? <span className="block text-fg-subtle">{f.nota}</span> : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
              <p className="text-xs text-fg-subtle">Conteúdo educativo. Não substitui avaliação individual de profissional de saúde.</p>
            </section>
          ) : null}

          {nivel < 3 ? (
            <Button variant="secondary" className="w-full" onClick={() => setNivel((n) => (n === 1 ? 2 : 3))}>
              {nivel === 1 ? "Entenda melhor (1–2 min)" : "A ciência por trás"}
            </Button>
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={alternarSalvo} aria-pressed={salvo}>{salvo ? "★ Salva" : "☆ Salvar"}</Button>
            <Button variant="gold" onClick={() => setCard(true)}>Compartilhar</Button>
          </div>
          {resultado ? (
            <button type="button" onClick={() => setResposta(null)} className="alvo text-sm text-fg-muted underline underline-offset-4 hover:text-fg">Refazer o quiz</button>
          ) : null}
        </>
      )}

      {card ? <CardDescoberta conteudo={c} onFechar={() => setCard(false)} /> : null}
    </article>
  );
}
