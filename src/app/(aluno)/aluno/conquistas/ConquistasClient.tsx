"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Card, CardBody } from "@/components/ui/Card";
import { formatarMin, type DadosCard, type ModeloId } from "@/lib/chalala/card";
import type { ResumoMensal } from "@/lib/conquistas/mensal";
import type { ItemRecorde } from "@/lib/conquistas/regras";
import { BRAND } from "@/config/brand";
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import type { Medalha } from "@/lib/conquistas/vitrine";

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

export function ConquistasClient({ nome, mensal, conquistas, reconhecimentos, proximas, criterios, medalhas, proxima }: { nome: string; mensal: ResumoMensal; conquistas: Conquista[]; reconhecimentos: Reconhecimento[]; proximas: Array<{ codigo: string; titulo: string; criterio: string }>; criterios: Record<string, string>; medalhas: Medalha[]; proxima: Medalha | null }) {
  const [editor, setEditor] = useState<{ dados: DadosCard; modelo: ModeloId; origem: "historico" | "mensal" | "reconhecimento" } | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [todosRecordes, setTodosRecordes] = useState(false);
  const recordes = conquistas.filter((c) => c.codigo === "recorde");
  const visiveis = conquistas.filter((c) => c.codigo !== "recorde");
  const ganhas = medalhas.filter((m) => m.conquistada).length;
  const sel = medalhas.find((m) => m.codigo === aberta) ?? null;
  const conquistaDaMedalha = (codigo: string) => conquistas.filter((c) => c.codigo === codigo).sort((a, b) => (a.conquistado_em < b.conquistado_em ? -1 : 1))[0];

  return (
    <>
      <section className="space-y-3" aria-labelledby="medalhas-titulo">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="medalhas-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Minhas medalhas</h2>
          <p className="text-xs text-fg-muted"><span className="font-bold text-fg">{ganhas}</span> de {medalhas.length}</p>
        </div>
        {proxima ? (
          <Card className="border-accent/40">
            <CardBody className="flex items-center gap-3 py-3">
              <MedalhaIcone selo={proxima.selo} conquistada={false} atual={proxima.atual} alvo={proxima.alvo} tamanho={56} />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sua próxima medalha</p>
                <p className="font-bold leading-tight">{proxima.titulo}</p>
                {proxima.alvo ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={proxima.alvo} aria-valuenow={proxima.atual ?? 0} aria-label={`Progresso: ${proxima.atual ?? 0} de ${proxima.alvo}`}>
                      <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(((proxima.atual ?? 0) / proxima.alvo) * 100)}%` }} />
                    </div>
                    <span className="shrink-0 font-mono text-xs text-fg-muted">{proxima.atual ?? 0}/{proxima.alvo}</span>
                  </div>
                ) : null}
                {proxima.falta ? <p className="mt-1 text-xs text-fg-muted">{proxima.falta}</p> : null}
              </div>
            </CardBody>
          </Card>
        ) : (
          <p className="rounded-xl border border-accent/40 p-3 text-sm">Você conquistou todas as medalhas. Chalalá! 🏅</p>
        )}
        <ul className="grid grid-cols-3 gap-2" aria-label="Medalhas">
          {medalhas.map((m) => (
            <li key={m.codigo}>
              <button type="button" onClick={() => setAberta(aberta === m.codigo ? null : m.codigo)} aria-expanded={aberta === m.codigo} className={`relative flex w-full flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors ${aberta === m.codigo ? "border-accent/60 bg-card" : "border-transparent hover:bg-card"}`}>
                {m.nova ? <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 text-[9px] font-bold uppercase text-bg">Nova</span> : null}
                <MedalhaIcone selo={m.selo} conquistada={m.conquistada} atual={m.atual} alvo={m.alvo} nova={m.nova} />
                <span className={`text-[11px] font-semibold leading-tight ${m.conquistada ? "text-fg" : "text-fg-muted"}`}>{m.titulo}</span>
                <span className="text-[10px] text-fg-subtle">{m.conquistada && m.data ? fmtData.format(new Date(m.data)) : m.alvo ? `${m.atual ?? 0}/${m.alvo}` : "a conquistar"}</span>
              </button>
            </li>
          ))}
        </ul>
        {sel ? (
          <Card>
            <CardBody className="space-y-1.5 text-sm">
              <p className="font-bold">{sel.titulo}</p>
              <p className="text-xs text-fg-muted">{criterios[sel.codigo]}</p>
              {sel.conquistada ? (
                <>
                  <p className="text-xs text-success">Conquistada em {sel.data ? fmtData.format(new Date(sel.data)) : "—"}.</p>
                  {sel.codigo !== "relatorio_mensal" && conquistaDaMedalha(sel.codigo) ? (
                    <button type="button" onClick={() => setEditor({ ...cardDaConquista(conquistaDaMedalha(sel.codigo)!), origem: "historico" })} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Gerar card desta medalha</button>
                  ) : null}
                </>
              ) : (
                <p className="text-xs">{sel.falta}</p>
              )}
            </CardBody>
          </Card>
        ) : null}
      </section>

      {recordes.length ? (
        <section className="space-y-2" aria-labelledby="rec-pessoais-titulo">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="rec-pessoais-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Recordes pessoais</h2>
            <p className="text-xs text-fg-muted"><span className="font-bold text-fg">{recordes.length}</span> treino(s) com recorde</p>
          </div>
          <ol className="space-y-2">
            {(todosRecordes ? recordes : recordes.slice(0, 3)).map((c) => (
              <li key={c.id}>
                <Card>
                  <CardBody className="space-y-1 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-accent">Recorde</p>
                      <time className="shrink-0 text-xs text-fg-subtle" dateTime={c.conquistado_em}>{fmtData.format(new Date(c.conquistado_em))}</time>
                    </div>
                    <ul className="space-y-0.5 text-sm">
                      {(c.dados.recordes ?? []).map((r, i) => (
                        <li key={i}><span className="font-semibold">{r.exercicio}</span>: <span className="text-fg-muted">{r.tipo === "carga" ? `${r.agora} kg (antes ${r.antes} kg)` : `${r.agora} repetições com ${r.carga} kg (antes ${r.antes})`}</span></li>
                      ))}
                      {!c.dados.recordes?.length && c.descricao ? <li className="text-fg-muted">{c.descricao}</li> : null}
                    </ul>
                    <button type="button" onClick={() => setEditor({ ...cardDaConquista(c), origem: "historico" })} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">Gerar card</button>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ol>
          {recordes.length > 3 ? (
            <button type="button" onClick={() => setTodosRecordes((v) => !v)} className="alvo text-xs font-semibold text-fg-muted underline">{todosRecordes ? "Mostrar menos" : `Ver todos os ${recordes.length}`}</button>
          ) : null}
        </section>
      ) : null}

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
          Linha do tempo
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
