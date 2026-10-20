"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardBody } from "@/components/ui/Card";
import { formatarMin, type DadosCard, type ModeloId } from "@/lib/chalala/card";
import type { ResumoMensal } from "@/lib/conquistas/mensal";
import type { ItemRecorde } from "@/lib/conquistas/regras";
import { BRAND } from "@/config/brand";

const EditorCard = dynamic(() => import("@/components/chalala/EditorCard"), { ssr: false });

type Conquista = { id: string; codigo: string; titulo: string; descricao: string | null; conquistado_em: string; dados: { recordes?: ItemRecorde[]; meta?: number } };
type Reconhecimento = { id: string; mensagem: string; created_at: string; conquista: string | null };

const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
const diaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));

function cardDaConquista(c: Conquista): { dados: DadosCard; modelo: ModeloId } {
  const data = diaLocal(c.conquistado_em);
  if (c.codigo === "recorde" && c.dados.recordes?.length) return { dados: { data, recordes: c.dados.recordes }, modelo: "C" };
  if (c.codigo === "eu_voltei") return { dados: { data, retomada: true }, modelo: "D" };
  if (c.codigo === "primeira_meta_semanal" && c.dados.meta) return { dados: { data, meta: c.dados.meta, feitosSemana: c.dados.meta, metaCumprida: true }, modelo: "B" };
  return { dados: { data, conquistaTitulo: c.titulo }, modelo: "C" };
}

export function ConquistasClient({ nome, mensal, conquistas, reconhecimentos, proximas, criterios }: { nome: string; mensal: ResumoMensal; conquistas: Conquista[]; reconhecimentos: Reconhecimento[]; proximas: Array<{ codigo: string; titulo: string; criterio: string }>; criterios: Record<string, string> }) {
  const [editor, setEditor] = useState<{ dados: DadosCard; modelo: ModeloId; origem: "historico" | "mensal" | "reconhecimento" } | null>(null);
  const visiveis = conquistas;

  return (
    <>
      {reconhecimentos.length ? (
        <section className="space-y-2" aria-labelledby="rec-titulo">
          <h2 id="rec-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
            Mensagens do {BRAND.name}
          </h2>
          {reconhecimentos.map((r) => (
            <Card key={r.id} className="border-accent/40">
              <CardBody className="space-y-2">
                {r.conquista ? <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{r.conquista}</p> : null}
                <p className="text-sm">“{r.mensagem}”</p>
                <p className="text-[11px] text-fg-subtle">
                  Escrita pelo seu personal · {fmtData.format(new Date(r.created_at))}
                </p>
                <button type="button" onClick={() => setEditor({ dados: { reconhecimento: { mensagem: r.mensagem, autor: BRAND.name, conquista: r.conquista }, data: diaLocal(r.created_at) }, modelo: "reconhecimento", origem: "reconhecimento" })} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                  Gerar card
                </button>
              </CardBody>
            </Card>
          ))}
        </section>
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Minha evolução em {mensal.periodoCompleto ? "30 dias" : "andamento"}</p>
            <p className="text-xs text-fg-muted">{mensal.periodoCompleto ? "Últimos 30 dias." : `${mensal.rotuloPeriodo}: você começou há menos de 30 dias, então o período ainda está incompleto.`}</p>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Treinos concluídos</dt>
              <dd className="font-mono text-lg font-bold">{mensal.treinos}</dd>
            </div>
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Aderência (28 dias)</dt>
              <dd className="font-mono text-lg font-bold">{mensal.aderenciaPct != null ? `${mensal.aderenciaPct}%` : "—"}</dd>
            </div>
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Tempo registrado</dt>
              <dd className="font-mono text-lg font-bold">{mensal.tempoTotalMin ? formatarMin(mensal.tempoTotalMin) : "—"}</dd>
            </div>
            <div className="rounded-lg bg-surface p-2">
              <dt className="text-[11px] text-fg-subtle">Metas semanais cumpridas</dt>
              <dd className="font-mono text-lg font-bold">{mensal.metasCumpridas ?? "—"}</dd>
            </div>
          </dl>
          {mensal.evolucao ? <p className="text-sm"><span className="text-fg-muted">Evolução registrada:</span> {mensal.evolucao}</p> : null}
          <button
            type="button"
            onClick={() => setEditor({ dados: { data: mensal.ate, mensal: { rotuloPeriodo: mensal.rotuloPeriodo, treinos: mensal.treinos, aderenciaPct: mensal.aderenciaPct, tempoTotalMin: mensal.tempoTotalMin, metasCumpridas: mensal.metasCumpridas, evolucao: mensal.evolucao, conquista: mensal.conquista } }, modelo: "mensal", origem: "mensal" })}
            className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg"
          >
            Criar card da minha evolução
          </button>
          <p className="text-[11px] text-fg-subtle">Você escolhe quais números aparecem — ou nenhum, só a mensagem.</p>
        </CardBody>
      </Card>

      <section className="space-y-2" aria-labelledby="hist-titulo">
        <h2 id="hist-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">
          Histórico
        </h2>
        {visiveis.length ? (
          <ol className="space-y-2">
            {visiveis.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardBody className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-bold">{c.titulo}</p>
                      <time className="shrink-0 text-xs text-fg-subtle" dateTime={c.conquistado_em}>
                        {fmtData.format(new Date(c.conquistado_em))}
                      </time>
                    </div>
                    {c.descricao ? <p className="text-sm text-fg-muted">{c.descricao}</p> : null}
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {c.codigo !== "relatorio_mensal" ? (
                        <button type="button" onClick={() => setEditor({ ...cardDaConquista(c), origem: "historico" })} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                          Gerar card
                        </button>
                      ) : null}
                      <details className="text-xs text-fg-subtle">
                        <summary className="cursor-pointer">Como é contada</summary>
                        <p className="mt-1">{criterios[c.codigo]}</p>
                      </details>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ol>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-fg-muted">Suas conquistas aparecem aqui a partir do primeiro treino concluído.</div>
        )}
      </section>

      {proximas.length ? (
        <details className="rounded-xl border border-border p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Como as conquistas funcionam</summary>
          <p className="mt-2 text-xs text-fg-muted">Elas reconhecem constância e evolução real. Nada é por carga maior que a de outras pessoas, peso perdido ou treino em excesso — e descanso prescrito nunca conta contra você.</p>
          <ul className="mt-2 space-y-1.5 text-xs">
            {proximas.map((p) => (
              <li key={p.codigo}>
                <span className="font-semibold">{p.titulo}:</span> <span className="text-fg-muted">{p.criterio}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {editor ? <EditorCard dados={editor.dados} modeloInicial={editor.modelo} nome={nome} origem={editor.origem} onFechar={() => setEditor(null)} /> : null}
    </>
  );
}
