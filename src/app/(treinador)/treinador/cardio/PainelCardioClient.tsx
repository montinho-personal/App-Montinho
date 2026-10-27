"use client";

// Lista do personal no Montinho Cardio: filtro por sinal, adesão da semana,
// 4 semanas, esforço e o WhatsApp com o modelo certo (nada é enviado sozinho;
// o contato só fica registrado quando o personal confirma).
import { useState } from "react";
import Link from "next/link";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { eventoGa } from "@/components/analytics/ga";
import { preencherModelo, type ModeloId, type ModelosMensagem } from "@/lib/acompanhamento/modelos";
import { infoModalidade } from "@/lib/cardio/modalidades";
import type { LinhaPainelCardio } from "@/lib/data/cardio";

type Filtro = "todos" | "atencao" | "acompanhar" | "reconhecer";
const nivelDe = (l: LinhaPainelCardio): Exclude<Filtro, "todos"> | null => (l.sinais.some((s) => s.nivel === "atencao") ? "atencao" : l.sinais.some((s) => s.nivel === "acompanhar") ? "acompanhar" : l.sinais.some((s) => s.nivel === "reconhecer") ? "reconhecer" : null);
const EMOJI = { atencao: "🔴", acompanhar: "🟡", reconhecer: "💛" } as const;

/** Modelo pelo sinal mais importante do aluno. */
function modeloDe(l: LinhaPainelCardio): ModeloId {
  const t = new Set(l.sinais.map((s) => s.tipo));
  if (t.has("retomou")) return "cardio_retorno";
  if (t.has("queda")) return "cardio_queda";
  if (t.has("adesao_baixa") || t.has("ignorado")) return "cardio_falta";
  if (t.has("evolucao") || t.has("meta_cumprida")) return "cardio_meta";
  return "cardio_falta";
}

export function PainelCardioClient({ linhas, modelos }: { linhas: LinhaPainelCardio[]; modelos: ModelosMensagem }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const conta = (f: Exclude<Filtro, "todos">) => linhas.filter((l) => nivelDe(l) === f).length;
  const peso = { atencao: 0, acompanhar: 1, reconhecer: 2 } as const;
  const lista = linhas
    .filter((l) => filtro === "todos" || nivelDe(l) === filtro)
    .sort((a, b) => (nivelDe(a) ? peso[nivelDe(a)!] : 3) - (nivelDe(b) ? peso[nivelDe(b)!] : 3) || a.nome.localeCompare(b.nome, "pt-BR"));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar">
        {([["todos", `Todos (${linhas.length})`], ["atencao", `🔴 Atenção ${conta("atencao")}`], ["acompanhar", `🟡 Acompanhar ${conta("acompanhar")}`], ["reconhecer", `💛 Evolução ${conta("reconhecer")}`]] as Array<[Filtro, string]>).map(([v, t]) => (
          <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold ${filtro === v ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>{t}</button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {lista.map((l) => <Cartao key={l.alunoId} l={l} modelos={modelos} />)}
      </div>
    </div>
  );
}

function Cartao({ l, modelos }: { l: LinhaPainelCardio; modelos: ModelosMensagem }) {
  const [texto, setTexto] = useState(() => preencherModelo(modelos[modeloDe(l)], { nome: l.nome }));
  const [perguntar, setPerguntar] = useState(false);
  const [registrado, setRegistrado] = useState(false);
  const s = l.semanaAtual;
  const nivel = nivelDe(l);
  async function confirmar() {
    const r = await fetch("/api/acompanhamento/contato", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aluno_id: l.alunoId, motivo: "cardio" }) }).catch(() => null);
    if (r?.ok) {
      setRegistrado(true);
      setPerguntar(false);
    }
  }
  return (
    <article className="space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/treinador/alunos/${l.alunoId}/cardio`} className="font-bold hover:underline">{l.nome}</Link>
          {l.visitante ? <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-[10px]">visitante</span> : null}
          <p className="text-xs text-fg-muted">
            {l.prescricoes.length ? l.prescricoes.map((p) => `${infoModalidade(p.modalidade).emoji} ${p.duracao_min} min ${p.frequencia_semanal}×`).join(" · ") : "Sem prescrição (cardio livre)"}
          </p>
        </div>
        {nivel ? <span aria-label={nivel}>{EMOJI[nivel]}</span> : null}
      </header>
      {s && s.alvoMin ? (
        <p>
          Semana: <strong>{s.minutos}</strong> de {s.alvoMin} min · {s.sessoes}/{s.alvoSessoes} sessões
          {l.esforcoMedio != null ? <span className="text-fg-muted"> · esforço médio {String(l.esforcoMedio).replace(".", ",")}/10</span> : null}
        </p>
      ) : (
        <p className="text-fg-muted">{l.ultimoCardio ? `Último cardio: ${l.ultimoCardio.slice(8, 10)}/${l.ultimoCardio.slice(5, 7)}` : "Nenhum cardio registrado ainda."}</p>
      )}
      {l.quatro.length ? (
        <div className="flex gap-1" aria-label="Últimas semanas">
          {l.quatro.map((w) => (
            <span key={w.inicio} title={`Semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}: ${w.sessoes}/${w.alvoSessoes}`} className={`h-2 flex-1 rounded-full ${w.status === "cumprida" ? "bg-success" : w.status === "pausada" ? "bg-fg-subtle" : w.sessoes ? "bg-warning" : "bg-danger/60"}`} />
          ))}
        </div>
      ) : null}
      {l.sinais.length ? (
        <ul className="space-y-0.5 text-xs">
          {l.sinais.map((x) => <li key={`${x.tipo}:${x.data}`}>{EMOJI[x.nivel]} {x.texto}</li>)}
        </ul>
      ) : null}
      {nivel ? (
        <div className="space-y-2">
          <textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 600))} className="w-full rounded-md border border-border bg-bg p-2 text-xs" aria-label={`Mensagem para ${l.nome}`} />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a href={linkWhatsApp(l.telefone, texto)} target="_blank" rel="noopener noreferrer" onClick={() => { eventoGa("cardio_whatsapp_click", { nivel }); setPerguntar(true); }} className="alvo inline-flex items-center gap-1 rounded-md bg-[#25D366] px-3 py-1.5 font-bold text-black">💬 WhatsApp</a>
            {registrado ? <span className="text-success">Contato registrado.</span> : null}
            {perguntar && !registrado ? (
              <span className="flex items-center gap-2">
                Você enviou?
                <button type="button" onClick={() => void confirmar()} className="alvo rounded-md bg-accent px-2 py-1 font-bold text-bg">Sim, enviei</button>
                <button type="button" onClick={() => setPerguntar(false)} className="alvo rounded-md border border-border px-2 py-1">Ainda não</button>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
