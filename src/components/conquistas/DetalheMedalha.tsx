"use client";

// Detalhe educativo de uma medalha (divulgação progressiva): primeiro a
// mensagem curta, estado e progresso; o conteúdo completo só abre se o aluno
// tocar em “Entenda por que isso é importante”.
import { useState } from "react";
import { MedalhaIcone } from "./MedalhaIcone";
import { CATEGORIA_ROTULO, CONTEUDO, FONTES } from "@/lib/conquistas/conteudo";
import type { Medalha } from "@/lib/conquistas/vitrine";
import { enviarEvento } from "@/components/chalala/evento";
import { BRAND } from "@/config/brand";

const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

export function DetalheMedalha({ m, reconhecimento, onGerarCard, onFechar, rotuloEntender = "Entenda por que isso é importante", rotuloCard = "Gerar card desta medalha" }: { m: Medalha; reconhecimento?: { mensagem: string; data: string } | null; onGerarCard?: () => void; onFechar?: () => void; rotuloEntender?: string; rotuloCard?: string }) {
  const [aberto, setAberto] = useState(false);
  const t = CONTEUDO[m.codigo];
  const pct = m.alvo ? Math.round(((m.atual ?? 0) / m.alvo) * 100) : null;

  function entender() {
    if (!aberto) enviarEvento({ tipo: "explicacao_aberta", origem: "medalha" });
    setAberto((v) => !v);
  }

  return (
    <section className="space-y-3 rounded-xl border border-accent/40 bg-card p-4 text-sm" aria-label={`Medalha ${t.nome}`}>
      <div className="flex items-start gap-3">
        <MedalhaIcone selo={m.selo} conquistada={m.conquistada} atual={m.atual} alvo={m.alvo} tamanho={64} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{CATEGORIA_ROTULO[t.categoria]}</p>
          <p className="text-base font-bold leading-tight">{t.nome}</p>
          <p className={`text-xs ${m.conquistada ? "text-success" : "text-fg-muted"}`}>
            {m.conquistada ? `Conquistada em ${m.data ? fmtData.format(new Date(m.data)) : "—"}` : m.disponivel ? "Ainda não conquistada" : "Fora do momento desta medalha"}
          </p>
        </div>
        {onFechar ? (
          <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo -mr-1 -mt-1 text-fg-muted hover:text-fg">✕</button>
        ) : null}
      </div>

      <p className="font-semibold">{m.conquistada ? t.mensagem : t.comoConquistar}</p>

      {!m.conquistada && m.alvo ? (
        <div className="space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={m.alvo} aria-valuenow={m.atual ?? 0} aria-label={`Progresso: ${m.atual ?? 0} de ${m.alvo}`}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-fg-muted"><span className="font-mono">{m.atual ?? 0}/{m.alvo}</span>{m.falta ? ` · ${m.falta}` : ""}</p>
        </div>
      ) : !m.conquistada && m.falta ? (
        <p className="text-xs text-fg-muted">{m.falta}</p>
      ) : null}

      {reconhecimento ? (
        <blockquote className="rounded-lg border-l-2 border-accent bg-accent-soft/40 px-3 py-2">
          <p>“{reconhecimento.mensagem}”</p>
          <footer className="mt-1 text-[11px] text-fg-subtle">Escrita pelo {BRAND.name} · {fmtData.format(new Date(reconhecimento.data))}</footer>
        </blockquote>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <button type="button" onClick={entender} aria-expanded={aberto} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
          {aberto ? "Fechar explicação" : rotuloEntender}
        </button>
        {m.conquistada && onGerarCard ? (
          <button type="button" onClick={onGerarCard} className="alvo text-xs font-semibold text-fg-muted underline-offset-2 hover:underline">{rotuloCard}</button>
        ) : null}
      </div>

      {aberto ? (
        <div className="space-y-3 border-t border-border pt-3">
          <Bloco titulo={m.conquistada ? "O que você conquistou" : "O que essa medalha reconhece"} texto={t.significado} />
          <Bloco titulo="Por que isso importa" texto={t.importancia} />
          <Bloco titulo="O que a ciência diz" texto={t.explicacao} />
          <Bloco titulo={m.conquistada ? "Próximo passo" : "Como chegar lá"} texto={m.conquistada ? t.proximoPasso : `${t.comoConquistar} ${t.proximoPasso}`} />
          <p className="text-[11px] text-fg-subtle"><span className="font-semibold">Como é contada:</span> {t.criterio}</p>
          <details className="text-[11px] text-fg-subtle">
            <summary className="cursor-pointer">Fontes</summary>
            <ul className="mt-1 space-y-1">
              {t.fontes.map((f) => (
                <li key={f}>
                  {FONTES[f].titulo}{" "}
                  <a href={`https://doi.org/${FONTES[f].doi}`} target="_blank" rel="noreferrer" className="underline">doi:{FONTES[f].doi}</a>
                  {FONTES[f].nota ? <span className="block">{FONTES[f].nota}</span> : null}
                </li>
              ))}
            </ul>
            <p className="mt-1">Resultados de pesquisas são médias de grupos: cada pessoa tem o seu ritmo. Texto revisado em {t.versao.slice(0, 10).split("-").reverse().join("/")}.</p>
          </details>
        </div>
      ) : null}
    </section>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{titulo}</p>
      <p className="mt-0.5 text-fg-muted">{texto}</p>
    </div>
  );
}
