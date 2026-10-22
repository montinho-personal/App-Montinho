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
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { indicePorNome } from "@/lib/biblioteca/itens";
import { normalizarNome } from "@/lib/grupos";
import { VolumeAluno } from "@/components/montador/VolumeAluno";
import { TreinoAcordeao } from "@/components/treinos/TreinoAcordeao";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { ProgressoSemana } from "@/components/aderencia/ProgressoSemana";
import { ResumoAderencia } from "@/components/aderencia/ResumoAderencia";
import { CalendarioConsistencia } from "@/components/aderencia/CalendarioConsistencia";
import { MetaPausasCard } from "@/components/aderencia/MetaPausasCard";
import { SemanasBarras } from "@/components/graficos/SemanasBarras";
import { AnelPercentual } from "@/components/graficos/AnelPercentual";
import { dataBR, diasAte, tempoRelativo } from "@/lib/format";
import { AtribuirTreinoButton } from "./AtribuirTreinoModal";
import { EditarAlunoButton } from "./EditarAlunoModal";
import { EnviarAcessoButton } from "./EnviarAcesso";
import { ComparadorFotos } from "./ComparadorFotos";
import { ComparadorMedidas } from "./ComparadorMedidas";
import { PainelCheckins } from "./PainelCheckins";
import { CalculoDietaCard } from "./CalculoDietaCard";
import { RelatorioEvolucao } from "@/components/relatorios/RelatorioEvolucao";
import { assinaturaTreinos, prescricoesParaAluno } from "@/lib/prescricoes";
import { auditarPrescricao } from "@/lib/prescricoes/auditar";
import { PrescricaoProntaCard } from "@/components/prescricoes/PrescricaoProntaCard";
import { HistoricoResumoCard } from "@/components/historico/HistoricoResumoCard";
import { EstrategiaPerfilCard } from "@/components/estrategia/EstrategiaPerfilCard";
import { estrategiaVigente } from "@/lib/data/estrategias";
import { faseAtual, inicioDasFases } from "@/lib/estrategia/fases";
import { importacoesParaAluno } from "@/lib/historico";
import { listarHistoricoResumo } from "@/lib/data/historico";
import { listarExtras, listarSolicitacoes } from "@/lib/data/extras";
import { AcompanhamentoClient } from "./AcompanhamentoClient";
import type { Anamnese } from "@/lib/supabase/types-extended";
import type { Evolucao } from "@/lib/supabase/types";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ dias?: string }> };

export const metadata = { title: "Aluno" };


const ATALHO = "touch flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border bg-bg/40 px-1 py-2.5 text-center text-[11px] font-semibold text-fg-muted hover:border-accent/50 hover:text-fg";

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
  const [aderencia, pedidosExtra, extrasAluno, historicoResumo, estrategia] = await Promise.all([aderenciaDoAluno(aluno), listarSolicitacoes({ alunoId: aluno.id }), listarExtras(aluno.id), listarHistoricoResumo(aluno.id), estrategiaVigente(aluno.id)]);
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
        tecnicaConfig: e.tecnica_config ?? null,
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
          <Avatar nome={aluno.profile?.nome ?? "?"} url={aluno.profile?.avatar_url} size={88} className="text-2xl" />
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
            {/* Ações: as duas principais em destaque e atalhos com ícone (fácil de achar no celular). */}
            <div className="mt-5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/treinador/alunos/${id}/aula`} className="touch flex flex-col items-center justify-center gap-0.5 rounded-xl bg-accent px-3 py-3 text-center font-bold text-bg hover:bg-accent-hover">
                  <span aria-hidden className="text-xl">👥</span>
                  <span className="text-sm">Dar aula agora</span>
                </Link>
                <Link href={`/treinador/alunos/${id}/treinos`} className="touch flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-accent/70 px-3 py-3 text-center font-bold text-accent hover:bg-accent/10">
                  <span aria-hidden className="text-xl">📝</span>
                  <span className="text-sm">Revisar treino</span>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                <Link href={`/treinador/alunos/${id}/conquistas`} className={ATALHO}>
                  <span aria-hidden className="text-lg">🏆</span>
                  Troféus
                </Link>
                <Link href={`/treinador/alunos/${id}/jornada`} className={ATALHO}>
                  <span aria-hidden className="text-lg">🗺️</span>
                  Jornada
                </Link>
                <AtribuirTreinoButton alunoId={id} templates={templates} className={ATALHO}>
                  <span aria-hidden className="text-lg">📋</span>
                  Template
                </AtribuirTreinoButton>
                <EditarAlunoButton alunoId={id} inicial={{ nome: aluno.profile?.nome ?? "", telefone: aluno.telefone ?? "", status: aluno.status, data_nascimento: aluno.data_nascimento ?? "", data_inicio: aluno.data_inicio ?? "", acesso_ate: aluno.acesso_ate ?? "", objetivo: aluno.objetivo ?? "" }} className={ATALHO}>
                  <span aria-hidden className="text-lg">✏️</span>
                  Editar
                </EditarAlunoButton>
                <EnviarAcessoButton alunoId={aluno.id} nome={aluno.profile?.nome ?? ""} email={aluno.profile?.email ?? null} telefone={aluno.telefone ?? null} className={ATALHO} />
              </div>
            </div>
            {aderencia.semanas.length >= 2 ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <AnelPercentual valor={aderencia.indices.d28.pct} rotulo="Aderência nas últimas 4 semanas" tamanho={52} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-fg-subtle">Aderência 4 semanas</p>
                    <p className="text-sm font-semibold">{aderencia.semanaAtual?.meta ? `Esta semana: ${aderencia.semanaAtual.pontos.toLocaleString("pt-BR")}/${aderencia.semanaAtual.meta}` : "Sem meta nesta semana"}</p>
                  </div>
                </div>
                <div className="min-w-[180px] flex-1 max-w-xs">
                  <p className="text-[10px] uppercase tracking-wider text-fg-subtle mb-1">Últimas 8 semanas</p>
                  <SemanasBarras semanas={aderencia.semanas} quantidade={8} altura={44} />
                </div>
              </div>
            ) : null}
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

      <EstrategiaPerfilCard alunoId={id} vigente={estrategia?.dados ?? null} importadaEm={estrategia?.created_at ?? null} fase={estrategia ? faseAtual(estrategia.dados.fases, inicioDasFases(aluno.data_inicio, estrategia.dados.data), hojeLocal) : null} />
      {prescricoesParaAluno(aluno.profile?.nome).map((pr) => (
        <PrescricaoProntaCard
          key={pr.id}
          alunoId={id}
          prescricao={{ id: pr.id, titulo: pr.titulo }}
          auditoria={auditarPrescricao(pr.plano)}
          pendencias={pr.pendencias}
          jaCadastrada={versoes.some((v) => v.motivo?.includes(`[${pr.id}]`)) || (plano.treinos.length > 0 && assinaturaTreinos(plano.treinos) === assinaturaTreinos(pr.plano.treinos))}
        />
      ))}
      {importacoesParaAluno(aluno.profile?.nome).map((imp) => (
        <HistoricoResumoCard
          key={imp.id}
          alunoId={id}
          importacao={{ id: imp.id, titulo: imp.titulo, linhas: imp.linhas, avisos: imp.avisos }}
          gravadas={historicoResumo.filter((r) => r.importacao === imp.id).length}
          diasRegistrados={sessoes.filter((s) => s.client_key?.startsWith(`hist:${imp.id}:`)).length}
          diasSemSeries={sessoes.filter((s) => s.client_key?.startsWith(`hist:${imp.id}:`) && s.exercicios.length === 0).length}
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
                    <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
                      {treinosAtivos.map((t) => (
                        <TreinoAcordeao key={t.id} letra={t.letra} nome={t.nome} exercicios={t.exercicios} vezesSemana={plano.programa?.frequencia?.[t.letra] ?? 1} editarHref={`/treinador/alunos/${id}/treinos`} />
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
                    <div>
                      <p className="mb-1.5 text-xs font-semibold text-fg-muted">Últimas 12 semanas</p>
                      <SemanasBarras semanas={aderencia.semanas} quantidade={12} altura={72} />
                    </div>
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
