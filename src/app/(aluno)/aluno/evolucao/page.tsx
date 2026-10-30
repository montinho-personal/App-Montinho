import { listarCardiosStrava } from "@/lib/data/strava";
import { CardiosStrava } from "@/components/strava/CardiosStrava";
import { SincronizarCardios } from "@/components/strava/SincronizarCardios";
import { requireAlunoPage } from "@/lib/auth/session";
import { listCheckIns, listEvolucao } from "@/lib/db";
import { getPlanoAtivo, listVersoes } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { RegistrarRelatorio } from "@/components/chalala/RegistrarRelatorio";
import { RelatorioEvolucao } from "@/components/relatorios/RelatorioEvolucao";
import { BRAND } from "@/config/brand";
import { getAluno } from "@/lib/db";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { listarHistoricoResumo } from "@/lib/data/historico";
import { dataLocal } from "@/lib/aderencia/calcular";
import { ProgressoSemana } from "@/components/aderencia/ProgressoSemana";
import { ResumoAderencia } from "@/components/aderencia/ResumoAderencia";
import { CalendarioConsistencia } from "@/components/aderencia/CalendarioConsistencia";
import { SemanasBarras } from "@/components/graficos/SemanasBarras";
import { FEATURES } from "@/lib/env";
import { ehVisitante } from "@/lib/auth/guards";
import { compararMeses } from "@/lib/visitante/evolucao";
import { MesContraMes } from "@/components/visitante/MesContraMes";
import { CtaVisitante } from "@/components/visitante/CtaVisitante";
import { ComparadorMedidas } from "@/components/evolucao/ComparadorMedidas";
import { AtalhosEvolucao, PainelEvolucaoAluno } from "@/components/relatorios/PainelEvolucaoAluno";
import { Acordeao } from "@/components/relatorios/Acordeao";
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import { painelEvolucao } from "@/lib/relatorios/painel-aluno";
import { exerciciosComCarga, totaisPorTreino } from "@/lib/relatorios/graficos-aluno";
import { evolucaoExercicio } from "@/lib/relatorios/calcular";
import { GraficosEvolucao, type PontoExercicio } from "@/components/relatorios/GraficosEvolucao";
import { cargasEmAlta } from "@/lib/relatorios/cargas-em-alta";
import { evolucaoInvisivel } from "@/lib/relatorios/invisivel";
import { sessaoParaConquista } from "@/lib/conquistas/mapear";
import { dataBR } from "@/lib/format";

export const metadata = { title: "Evolução" };

export default async function EvolucaoPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sessao = await requireAlunoPage();
  const { dias: d } = await searchParams;
  const dias = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  const [plano, sessoes, evolucao, checkIns, versoes, intervencoes, historicoResumo, cardios] = await Promise.all([
    getPlanoAtivo(sessao.alunoId),
    listSessoes(sessao.alunoId, { limite: 400 }),
    listEvolucao(sessao.alunoId),
    listCheckIns(sessao.alunoId, 120),
    listVersoes(sessao.alunoId, 10),
    listIntervencoes(sessao.alunoId, 5),
    listarHistoricoResumo(sessao.alunoId),
    listarCardiosStrava(sessao.alunoId, 10).catch(() => []),
  ]);
  const aluno = await getAluno(sessao.alunoId);
  const aderencia = aluno ? await aderenciaDoAluno(aluno) : null;
  // Modo Visitante: comparação de meses e semana fraca sem culpa.
  const visitante = FEATURES.modoVisitante && ehVisitante(sessao);
  const ultimaFechada = aderencia?.semanas.filter((w) => !w.atual && !w.pausada && w.meta).at(-1);
  const semanaFraca = Boolean(ultimaFechada && ultimaFechada.meta && ultimaFechada.pontos < ultimaFechada.meta);
  const comentario = intervencoes.find((i) => i.visivel_aluno && (i.tipo === "nota" || i.tipo === "mensagem" || i.tipo === "revisao_treino"));

  // Topo no estilo das redes: manchete, 3 números e destaques (regras em painel-aluno.ts).
  const hoje = dataLocal(new Date());
  const inicio = aluno ? (aluno.data_inicio ?? aluno.created_at.slice(0, 10)) : null;
  const invisivel = evolucaoInvisivel({ sessoes: sessoes.map(sessaoParaConquista), aderencia, dias, hoje, inicioAcompanhamento: inicio ?? sessoes.map((x) => dataLocal(x.iniciado_em)).sort()[0] ?? hoje });
  const painel = painelEvolucao({ sessoes, dias, emAlta: cargasEmAlta(sessoes, historicoResumo, 3), invisivel, medidas: evolucao, sequencia: aderencia?.sequencia.atual ?? 0 });

  // Gráficos fáceis (antes do relatório completo): treino a treino, exercício a exercício e peso.
  const exerciciosGrafico = exerciciosComCarga(sessoes).slice(0, 25);
  const pontosGrafico: Record<string, PontoExercicio[]> = Object.fromEntries(exerciciosGrafico.map((e) => [e.chave, evolucaoExercicio(sessoes, e.chave, historicoResumo).map((p) => ({ data: p.data, carga: p.cargaMax, volume: p.tonelagem, media: p.cargaMedia ?? null, forca: p.e1rmMax, repsPorCarga: p.repsPorCarga }))]));
  const pesoGrafico = evolucao.filter((m) => m.peso_kg != null).map((m) => ({ data: m.data, kg: Number(m.peso_kg) }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Sua evolução</h1>
        <p className="mt-1 text-sm text-fg-muted">O que mudou desde que você começou, a partir do que você registrou.</p>
      </header>
      <RegistrarRelatorio />
      <SincronizarCardios />

      <PainelEvolucaoAluno p={painel} dias={dias} periodos={[7, 30, 90]} basePath="/aluno/evolucao" anterior={dias === 7 ? "os 7 dias anteriores" : `os ${dias} dias anteriores`} />

      {comentario ? (
        <blockquote className="rounded-2xl border-l-4 border-accent bg-card px-4 py-3 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Recado do {BRAND.name}</p>
          <p className="mt-1">{comentario.descricao}</p>
          <footer className="mt-1 text-[11px] text-fg-subtle">{comentario.autor?.nome ?? BRAND.name} · {dataBR(comentario.created_at)}</footer>
        </blockquote>
      ) : null}

      {aderencia?.semanaAtual?.meta ? (
        <section id="consistencia" aria-label="Sua semana" className="scroll-mt-20 space-y-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-lg font-bold">Sua semana</h2>
          <ProgressoSemana semana={aderencia.semanaAtual} sequencia={aderencia.sequencia} extras={aderencia.semanaAtual?.extras ?? 0} />
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg-muted">Últimas 12 semanas</p>
            <SemanasBarras semanas={aderencia.semanas} quantidade={12} altura={72} />
          </div>
        </section>
      ) : null}

      <GraficosEvolucao treinos={totaisPorTreino(sessoes)} exercicios={exerciciosGrafico} pontos={pontosGrafico} peso={pesoGrafico} relatorioHref={`/relatorio/${sessao.alunoId}`} />
      <AtalhosEvolucao recordes={FEATURES.multimodalidade} />
      <ChamadaTrofeu acao="relatorio" />

      {visitante ? <MesContraMes c={compararMeses(sessoes)} semanaFraca={semanaFraca} /> : null}
      {visitante ? <CtaVisitante alunoId={sessao.alunoId} tela="evolucao" acessoFim={sessao.acessoFim ?? null} /> : null}

      <div className="space-y-1 pt-2">
        <h2 className="text-lg font-bold">Em detalhe</h2>
        <p className="text-xs text-fg-muted">Exercício por exercício, treino a treino e músculo a músculo.</p>
      </div>
      <RelatorioEvolucao
        modo="aluno"
        dias={dias}
        basePath="/aluno/evolucao"
        sessoes={sessoes}
        programa={plano.programa}
        treinos={plano.treinos}
        evolucao={evolucao}
        checkIns={checkIns}
        versoes={versoes}
        exportarHref={`/api/alunos/${sessao.alunoId}/exportar`}
        aderencia={aderencia}
        historicoResumo={historicoResumo}
        inicioAcompanhamento={inicio}
        semPeriodo
        semResumo
      />
      {aderencia ? (
        <Acordeao titulo="Calendário da constância" resumo="Dia a dia, aderência e sequência">
          <div className="space-y-4">
            <ResumoAderencia r={aderencia} />
            <CalendarioConsistencia dias={aderencia.dias} sessoes={aderencia.sessoesPorId} hoje={hoje} />
          </div>
        </Acordeao>
      ) : null}
      {cardios.length ? <CardiosStrava cardios={cardios} hoje={hoje} titulo="Seus cardios (Strava)" /> : null}
      {evolucao.length >= 2 ? <ComparadorMedidas evolucao={evolucao} titulo="Suas medidas: antes × depois" /> : null}
    </div>
  );
}
