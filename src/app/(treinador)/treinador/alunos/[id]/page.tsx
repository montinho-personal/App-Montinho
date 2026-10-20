import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { Tabs } from "@/components/ui/Tabs";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno, listDieta, listEvolucao, listTemplates, listFotos, listCheckIns, getAnamnese } from "@/lib/db";
import { getPlanoAtivo, listVersoes } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { listAdaptacoes, listIntervencoes } from "@/lib/data/acompanhamento";
import { frequenciaDoCalendario, type Calendario, type DiaVolume } from "@/lib/volume/calcular";
import { descreverTecnica, TECNICA_CURTA } from "@/lib/volume/tecnicas";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { indicePorNome } from "@/lib/biblioteca/itens";
import { normalizarNome } from "@/lib/grupos";
import { VolumeAluno } from "@/components/montador/VolumeAluno";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { ProgressoSemana } from "@/components/aderencia/ProgressoSemana";
import { ResumoAderencia } from "@/components/aderencia/ResumoAderencia";
import { CalendarioConsistencia } from "@/components/aderencia/CalendarioConsistencia";
import { MetaPausasCard } from "@/components/aderencia/MetaPausasCard";
import { dataBR, diasAte, tempoRelativo } from "@/lib/format";
import { AtribuirTreinoButton } from "./AtribuirTreinoModal";
import { ComparadorFotos } from "./ComparadorFotos";
import { ComparadorMedidas } from "./ComparadorMedidas";
import { PainelCheckins } from "./PainelCheckins";
import { CalculoDietaCard } from "./CalculoDietaCard";
import { RelatorioEvolucao } from "@/components/relatorios/RelatorioEvolucao";
import { assinaturaTreinos, prescricoesParaAluno } from "@/lib/prescricoes";
import { auditarPrescricao } from "@/lib/prescricoes/auditar";
import { PrescricaoProntaCard } from "@/components/prescricoes/PrescricaoProntaCard";
import { HistoricoResumoCard } from "@/components/historico/HistoricoResumoCard";
import { importacoesParaAluno } from "@/lib/historico";
import { listarHistoricoResumo } from "@/lib/data/historico";
import { listarExtras, listarSolicitacoes } from "@/lib/data/extras";
import { AcompanhamentoClient } from "./AcompanhamentoClient";
import type { Anamnese } from "@/lib/supabase/types-extended";
import type { Evolucao } from "@/lib/supabase/types";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ dias?: string }> };

export const metadata = { title: "Aluno" };


export default async function AlunoDetailPage({ params, searchParams }: PageProps) {
  await requireTreinadorPage();
  const { id } = await params;
  const { dias: d } = await searchParams;
  const dias = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  const aluno = await getAluno(id);
  if (!aluno) notFound();

  const [plano, sessoes, dieta, evolucao, templates, fotos, checkIns, versoes, adaptacoes, intervencoes, anamnese] = await Promise.all([
    getPlanoAtivo(id),
    listSessoes(id, { limite: 400 }),
    listDieta(id),
    listEvolucao(id),
    listTemplates(),
    listFotos(id),
    listCheckIns(id, 120),
    listVersoes(id, 20),
    listAdaptacoes(id),
    listIntervencoes(id, 30),
    getAnamnese(id),
  ]);
  const biblioteca = await listarBiblioteca();
  const [aderencia, pedidosExtra, extrasAluno, historicoResumo] = await Promise.all([aderenciaDoAluno(aluno), listarSolicitacoes({ alunoId: aluno.id }), listarExtras(aluno.id), listarHistoricoResumo(aluno.id)]);
  const tituloExtra = Object.fromEntries(extrasAluno.map((x) => [x.id, x.titulo]));
  const hojeLocal = dataLocal(new Date());

  const treinosAtivos = plano.treinos.filter((t) => t.ativo);
  // Mesmos dados que o montador usa: técnicas, secundários e pesos da biblioteca.
  const porId = new Map(biblioteca.map((b) => [b.id, b]));
  const porNome = indicePorNome(biblioteca);
  const diasVolume: DiaVolume[] = treinosAtivos.map((t) => ({
    letra: t.letra,
    exercicios: t.exercicios.map((e) => {
      const item = (e.biblioteca_id ? porId.get(e.biblioteca_id) : undefined) ?? porNome.get(normalizarNome(e.nome));
      return {
        id: e.id,
        nome: e.nome,
        grupo: e.grupo_muscular ?? "nao_classificado",
        secundarios: e.grupos_secundarios?.length ? e.grupos_secundarios : item?.secundarios ?? [],
        pesosSecundarios: item?.pesosSecundarios ?? null,
        series: e.series,
        seriesAquecimento: e.series_aquecimento,
        tecnica: e.tecnica,
        tecnicaExtras: e.tecnica_extras ?? null,
        tecnicaSeries: e.tecnica_series ?? null,
        rir: e.rir,
        contaVolume: e.conta_volume,
      };
    }),
  }));
  const cal = plano.programa?.calendario && "modo" in plano.programa.calendario ? (plano.programa.calendario as Calendario) : null;
  const freqCal = frequenciaDoCalendario(cal);
  const frequencia = Object.keys(freqCal).length ? freqCal : plano.programa?.frequencia ?? {};
  const diasAcesso = diasAte(aluno.acesso_ate);
  const ultimoPeso = (evolucao as Evolucao[]).at(-1)?.peso_kg ?? null;
  const a = anamnese as Anamnese | null;

  return (
    <div className="space-y-6">
      <Link href="/treinador/alunos" className="text-fg-muted text-sm hover:text-fg inline-flex min-h-6 items-center gap-1">
        ← Alunos
      </Link>

      <Card className="bg-grain-strong border-accent/20">
        <CardBody className="flex flex-col md:flex-row gap-6">
          <Avatar nome={aluno.profile?.nome ?? "?"} size={88} className="text-2xl" />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{aluno.profile?.nome}</h1>
              <AlunoStatusPill status={aluno.status} />
            </div>
            <p className="text-sm text-fg-muted mt-2">{aluno.objetivo}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
              <Field label="Último treino" value={tempoRelativo(sessoes[0]?.finalizado_em ?? sessoes[0]?.iniciado_em ?? aluno.ultimo_treino_em)} />
              <Field label="Protocolo" value={plano.programa ? `${plano.programa.nome} (v${plano.programa.versao})` : "sem programa"} />
              <Field label="Início" value={dataBR(aluno.data_inicio)} />
              <Field label="Acesso até" value={dataBR(aluno.acesso_ate)} hint={diasAcesso !== null ? (diasAcesso < 0 ? `vencido há ${Math.abs(diasAcesso)}d` : `${diasAcesso}d restantes`) : undefined} tone={diasAcesso !== null && diasAcesso < 0 ? "red" : diasAcesso !== null && diasAcesso <= 7 ? "gold" : "neutral"} />
            </div>
          </div>
          <div className="flex flex-col gap-2 self-start">
            <Link href={`/treinador/alunos/${id}/treinos`} className="touch inline-flex items-center justify-center rounded-md bg-accent px-4 text-sm font-bold text-bg hover:bg-accent-hover">
              Revisar treino
            </Link>
            <AtribuirTreinoButton alunoId={id} templates={templates} />
          </div>
        </CardBody>
      </Card>

      {a?.lesoes || a?.dores_atuais || aluno.observacoes ? (
        <Card className="border-gold/20 bg-gold/5">
          <CardBody>
            <div className="text-xs font-bold text-gold uppercase tracking-wider mb-1">Restrições e contexto (privado)</div>
            {a?.lesoes ? <p className="text-sm">Lesões: {a.lesoes}</p> : null}
            {a?.dores_atuais ? <p className="text-sm">Dores atuais: {a.dores_atuais}</p> : null}
            {aluno.observacoes ? <p className="text-sm text-fg-muted">{aluno.observacoes}</p> : null}
          </CardBody>
        </Card>
      ) : null}

      {prescricoesParaAluno(aluno.profile?.nome).map((pr) => (
        <PrescricaoProntaCard
          key={pr.id}
          alunoId={id}
          prescricao={{ id: pr.id, titulo: pr.titulo }}
          auditoria={auditarPrescricao(pr.plano)}
          pendencias={pr.pendencias}
          jaCadastrada={plano.treinos.length > 0 && assinaturaTreinos(plano.treinos) === assinaturaTreinos(pr.plano.treinos)}
        />
      ))}
      {importacoesParaAluno(aluno.profile?.nome).map((imp) => (
        <HistoricoResumoCard
          key={imp.id}
          alunoId={id}
          importacao={{ id: imp.id, titulo: imp.titulo, linhas: imp.linhas, avisos: imp.avisos }}
          gravadas={historicoResumo.filter((r) => r.importacao === imp.id).length}
          diasRegistrados={sessoes.filter((s) => s.client_key?.startsWith(`hist:${imp.id}:`)).length}
        />
      ))}
      <Tabs
        tabs={[
          {
            key: "treinos",
            label: `Plano (${treinosAtivos.length})`,
            content: (
              <div className="space-y-4">
                {treinosAtivos.length === 0 ? (
                  <Card className="border-dashed">
                    <CardBody className="text-center py-8 space-y-3">
                      <p className="text-sm text-fg-muted">Sem programa ativo.</p>
                      <Link href={`/treinador/alunos/${id}/treinos`} className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-bold text-bg">
                        Montar treino
                      </Link>
                    </CardBody>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {treinosAtivos.map((t) => (
                        <Card key={t.id}>
                          <CardBody>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center" aria-hidden>
                                <span className="text-xl font-black text-accent">{t.letra}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold truncate">{t.nome}</p>
                                <p className="text-xs text-fg-subtle">
                                  {t.exercicios.length} exercícios · {t.exercicios.reduce((n, e) => n + Math.max(0, e.series - (e.series_aquecimento ?? 0)), 0)} séries válidas · ×{plano.programa?.frequencia?.[t.letra] ?? 1}/sem
                                </p>
                              </div>
                            </div>
                            <ul className="mt-3 space-y-1 text-xs text-fg-muted">
                              {t.exercicios.map((e) => (
                                <li key={e.id} className="flex justify-between gap-2 min-w-0">
                                  <span className="truncate min-w-0">
                                    {e.nome}
                                    {descreverTecnica({ tecnica: e.tecnica, tecnicaExtras: e.tecnica_extras, tecnicaSeries: e.tecnica_series }, Math.max(0, e.series - (e.series_aquecimento ?? 0))) ? (
                                      <span className="ml-1 text-accent">
                                        · {TECNICA_CURTA[e.tecnica]} ({descreverTecnica({ tecnica: e.tecnica, tecnicaExtras: e.tecnica_extras, tecnicaSeries: e.tecnica_series }, Math.max(0, e.series - (e.series_aquecimento ?? 0)))})
                                      </span>
                                    ) : e.tecnica && e.tecnica !== "normal" && TECNICA_CURTA[e.tecnica] ? (
                                      <span className="ml-1 text-accent">· {TECNICA_CURTA[e.tecnica]}</span>
                                    ) : null}
                                  </span>
                                  <span className="font-mono shrink-0 max-w-[45%] truncate" title={`${e.series}×${e.reps}`}>
                                    {e.series}×{e.reps}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                    <VolumeAluno
                      dias={diasVolume}
                      frequencia={frequencia}
                      metas={plano.programa?.metas_volume ?? {}}
                      prioridades={plano.programa?.prioridades ?? []}
                      nivel={plano.programa?.nivel ?? null}
                      editarHref={`/treinador/alunos/${id}/treinos`}
                    />
                  </>
                )}
              </div>
            ),
          },
          {
            key: "consistencia",
            label: "Consistência",
            content: (
              <div className="space-y-4">
                <Card>
                  <CardBody className="space-y-4">
                    <ProgressoSemana semana={aderencia.semanaAtual} sequencia={aderencia.sequencia} extras={aderencia.semanaAtual?.extras ?? 0} />
                    <ResumoAderencia r={aderencia} />
                    <CalendarioConsistencia dias={aderencia.dias} sessoes={aderencia.sessoesPorId} hoje={hojeLocal} />
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <MetaPausasCard alunoId={id} metaAtual={aderencia.metaAtual.meta} origem={aderencia.metaAtual.origem} metas={aderencia.metas} pausas={aderencia.pausas} hoje={hojeLocal} />
                  </CardBody>
                </Card>
              </div>
            ),
          },
          {
            key: "evolucao",
            label: "Evolução",
            content: (
              <RelatorioEvolucao modo="treinador" dias={dias} basePath={`/treinador/alunos/${id}`} sessoes={sessoes} programa={plano.programa} treinos={plano.treinos} evolucao={evolucao as Evolucao[]} checkIns={checkIns} versoes={versoes} exportarHref={`/api/alunos/${id}/exportar`} historicoResumo={historicoResumo} aderencia={aderencia} inicioAcompanhamento={aluno.data_inicio ?? aluno.created_at.slice(0, 10)} pedidosExtra={pedidosExtra.slice(0, 15).map((p) => ({ titulo: tituloExtra[p.extra_id] ?? "Treino extra", status: p.status, data: p.created_at, resposta: p.resposta }))} />
            ),
          },
          {
            key: "acompanhamento",
            label: `Acompanhamento${adaptacoes.filter((x) => x.status === "aberta").length ? ` (${adaptacoes.filter((x) => x.status === "aberta").length})` : ""}`,
            content: <AcompanhamentoClient alunoId={id} adaptacoes={adaptacoes} intervencoes={intervencoes} />,
          },
          {
            key: "medidas",
            label: "Medidas e fotos",
            content: (
              <div className="space-y-4">
                <ComparadorMedidas evolucao={evolucao as never} />
                <ComparadorFotos fotos={fotos as never} />
              </div>
            ),
          },
          {
            key: "checkins",
            label: "Check-ins",
            content: <PainelCheckins checkIns={checkIns as never} dias={30} />,
          },
          {
            key: "dieta",
            label: `Dieta (${dieta.length})`,
            content: (
              <div className="space-y-3">
                <CalculoDietaCard alunoId={id} pesoInicial={ultimoPeso} />
                {dieta.map((dd) => (
                  <Card key={dd.id}>
                    <CardBody>
                      <div className="font-semibold">{dd.refeicao}</div>
                      {dd.horario ? <div className="text-xs text-fg-subtle">{dd.horario}</div> : null}
                      <ul className="text-sm space-y-1 text-fg-muted mt-2">
                        {dd.alimentos.map((al: { nome: string; quantidade: string }, i: number) => (
                          <li key={i}>
                            <span className="text-fg">{al.nome}</span>
                            <span className="text-fg-subtle"> — {al.quantidade}</span>
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                ))}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function Field({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "neutral" | "red" | "gold" }) {
  const hintColor = tone === "red" ? "text-red" : tone === "gold" ? "text-gold" : "text-fg-subtle";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-semibold">{label}</div>
      <div className="text-sm font-semibold mt-1">{value}</div>
      {hint ? <div className={`text-[10px] mt-0.5 ${hintColor}`}>{hint}</div> : null}
    </div>
  );
}
