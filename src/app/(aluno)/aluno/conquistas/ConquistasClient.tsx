"use client";

import { LENDARIAS } from "@/lib/conquistas/regras";
import { useEffect, useState } from "react";
import Link from "next/link";
import { VitrineMedalhas } from "@/components/conquistas/VitrineMedalhas";
import { enviarEvento } from "@/components/chalala/evento";
import { CATALOGO } from "@/lib/conquistas/regras";
import { CONTEUDO, nomeDaConquista } from "@/lib/conquistas/conteudo";
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

export function ConquistasClient({ nome, mensal, conquistas, reconhecimentos, destaque, proximas, ganhas, total, novas, jornada, reconhecimentosPorCodigo }: { nome: string; mensal: ResumoMensal; conquistas: Conquista[]; reconhecimentos: Reconhecimento[]; destaque: Medalha[]; proximas: Medalha[]; ganhas: number; total: number; novas: Array<{ id: string; codigo: string }>; jornada: string | null; reconhecimentosPorCodigo: Record<string, { mensagem: string; data: string }> }) {
  const [editor, setEditor] = useState<{ dados: DadosCard; modelo: ModeloId; origem: "historico" | "mensal" | "reconhecimento" } | null>(null);
  const [todosRecordes, setTodosRecordes] = useState(false);
  const recordes = conquistas.filter((c) => c.codigo === "recorde");
  const visiveis = conquistas.filter((c) => c.codigo !== "recorde");
  const novasMedalhas = destaque.filter((m) => novas.some((n) => n.codigo === m.codigo));
  // Vitrine vista (métrica agregada) e celebração mostrada uma vez só.
  useEffect(() => {
    enviarEvento({ tipo: "vitrine_vista", origem: "vitrine" });
    if (novas.length) void fetch("/api/conquistas/vistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: novas.map((n) => n.id) }) }).catch(() => undefined);
  }, [novas]);

  return (
    <>
      {novasMedalhas.length ? (
        <section className="space-y-2 rounded-xl border border-accent/50 bg-grain-strong p-4" aria-label="Novas conquistas">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{novasMedalhas.length > 1 ? "Novas conquistas" : "Nova conquista"}</p>
          {novasMedalhas.map((m) => (
            <div key={m.codigo} className="flex items-center gap-3">
              <MedalhaIcone selo={m.selo} conquistada atual={null} alvo={null} tamanho={48} nova lendaria={LENDARIAS.has(m.codigo)} />
              <div className="min-w-0 flex-1">
                <p className="font-bold leading-tight">{m.titulo}</p>
                <p className="text-sm text-fg-muted">{CONTEUDO[m.codigo].mensagem}</p>
              </div>
            </div>
          ))}
          <p className="text-[11px] text-fg-subtle">Mensagem automática do app. Toque na medalha abaixo para entender por que ela importa.</p>
        </section>
      ) : null}

      {jornada ? <p className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg-muted"><span className="font-semibold text-fg">Sua jornada: </span>{jornada}</p> : null}

      <section className="space-y-3" aria-labelledby="medalhas-titulo">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="medalhas-titulo" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Minhas medalhas</h2>
          <p className="text-xs text-fg-muted"><span className="font-bold text-fg">{ganhas}</span> de {total}</p>
        </div>
        {proximas.length ? (
          <Card className="border-accent/40">
            <CardBody className="space-y-2 py-3">
              <div className="flex items-center gap-3">
                <MedalhaIcone selo={proximas[0].selo} conquistada={false} atual={proximas[0].atual} alvo={proximas[0].alvo} tamanho={56} lendaria={LENDARIAS.has(proximas[0].codigo)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Sua próxima medalha</p>
                  <p className="font-bold leading-tight">{proximas[0].titulo}</p>
                  {proximas[0].alvo ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={proximas[0].alvo} aria-valuenow={proximas[0].atual ?? 0} aria-label={`Progresso: ${proximas[0].atual ?? 0} de ${proximas[0].alvo}`}>
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(((proximas[0].atual ?? 0) / proximas[0].alvo) * 100)}%` }} />
                      </div>
                      <span className="shrink-0 font-mono text-xs text-fg-muted">{proximas[0].atual ?? 0}/{proximas[0].alvo}</span>
                    </div>
                  ) : null}
                  {proximas[0].falta ? <p className="mt-1 text-xs text-fg-muted">{proximas[0].falta}</p> : null}
                </div>
              </div>
              {proximas.length > 1 ? (
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-fg-muted">Outras perto de sair ({proximas.length - 1})</summary>
                  <ul className="mt-1.5 space-y-1">
                    {proximas.slice(1).map((m) => (
                      <li key={m.codigo}><span className="font-semibold">{m.titulo}</span>{m.alvo ? <span className="font-mono text-fg-subtle"> {m.atual ?? 0}/{m.alvo}</span> : null}<span className="block text-fg-muted">{m.falta}</span></li>
                    ))}
                  </ul>
                </details>
              ) : null}
              <p className="text-[11px] text-fg-subtle">Todas saem seguindo o seu plano: não é preciso treinar além do prescrito.</p>
            </CardBody>
          </Card>
        ) : ganhas === total ? (
          <p className="rounded-xl border border-accent/40 p-3 text-sm">Você conquistou todas as medalhas. Chalalá! 🏅</p>
        ) : null}
        <VitrineMedalhas medalhas={destaque} nome={nome} reconhecimentos={reconhecimentosPorCodigo} />
        <Link href="/aluno/conquistas/todas" className="alvo inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline">Todas as minhas conquistas ({total} medalhas + recordes e retomadas) →</Link>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Link href="/aluno/conquistas/todas?aba=temas" className="alvo rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-fg-muted hover:text-fg">Por tema</Link>
          <Link href="/aluno/conquistas/todas?aba=desafiadores" className="alvo rounded-full border border-[#f59e0b]/50 px-3 py-1.5 text-xs font-semibold text-[#f5c451]">🔥 Mais desafiadores</Link>
          <Link href="/aluno/ranking" className="alvo rounded-full border border-accent/50 px-3 py-1.5 text-xs font-semibold text-accent">🏆 Ranking</Link>
        </div>
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
                      <p className="font-bold">{nomeDaConquista(c.codigo, c.titulo)}</p>
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
                        <p className="mt-1">{CATALOGO[c.codigo as keyof typeof CATALOGO]?.criterio ?? ""}</p>
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

      <details className="rounded-xl border border-border p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Como as conquistas funcionam</summary>
        <p className="mt-2 text-xs text-fg-muted">Elas reconhecem acontecimentos reais do seu treino: constância, retomadas e evolução. Consistência não é uma sequência perfeita — semanas diferentes acontecem e você pode reorganizar e continuar. Nada é por comparação com outras pessoas, peso perdido ou treino além do prescrito; treino extra não conta e pausa combinada com o Montinho não conta como falta.</p>
        <ul className="mt-2 space-y-1.5 text-xs">
          {(Object.keys(CATALOGO) as Array<keyof typeof CATALOGO>).map((k) => (
            <li key={k}>
              <span className="font-semibold">{CONTEUDO[k].nome}{CATALOGO[k].repete ? " (repete)" : ""}:</span> <span className="text-fg-muted">{CATALOGO[k].criterio}</span>
            </li>
          ))}
        </ul>
      </details>

      {editor ? <EditorCard dados={editor.dados} modeloInicial={editor.modelo} nome={nome} origem={editor.origem} onFechar={() => setEditor(null)} /> : null}
    </>
  );
}
