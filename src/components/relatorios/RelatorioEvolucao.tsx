// Relatório de evolução em duas camadas (resumo → análise detalhada).
// Server Component: recebe os dados já autorizados pela página que o chama.
import { ChamadaTrofeu } from "@/components/conquistas/ChamadaTrofeu";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Heatmap, HeatmapLegend } from "@/components/ui/Heatmap";
import { cargasEmAlta } from "@/lib/relatorios/cargas-em-alta";
import { CargasEmAltaLista } from "@/components/graficos/CargasEmAltaLista";
import { Sparkline } from "@/components/graficos/Sparkline";
import { POR_QUE } from "@/lib/evolucao/motor";
import type { TipoInvisivel } from "@/lib/relatorios/invisivel";

const POR_QUE_INVISIVEL: Record<TipoInvisivel, string> = {
  frequencia: POR_QUE.consistencia,
  regularidade: POR_QUE.consistencia,
  metas: POR_QUE.consistencia,
  reps_mesma_carga: POR_QUE.mais_reps,
  desempenho: POR_QUE.acima_media,
  retomada: "Interrupções acontecem. Retomar permite reconstruir a rotina, sem culpa e sem cobrança pelo período de ausência.",
};
import type { SessaoCompleta } from "@/lib/data/sessoes";
import type { Programa, ProgramaVersao } from "@/lib/supabase/types-sessoes";
import type { Evolucao } from "@/lib/supabase/types";
import type { CheckIn } from "@/lib/supabase/types-extended";
import { calcularVolumeSemanal, compararProgramadoRealizado, volumeRealizadoPorGrupo, type DiaVolume } from "@/lib/volume/calcular";
import { calendarioSessoes, melhoresMarcas, type ResumoEvolucao, periodoDias, resumoPeriodo, seriesRealizadasPorGrupo, sessoesNoPeriodo, tonelagem } from "@/lib/relatorios/calcular";
import { dataBR } from "@/lib/format";
import { GRUPO_LABEL, normalizarNome } from "@/lib/grupos";
import { Acordeao } from "./Acordeao";
import { dataLocal, somarDias, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import { evolucaoInvisivel } from "@/lib/relatorios/invisivel";
import { detalheRelatorio } from "@/lib/relatorios/detalhe";
import { sessaoParaConquista } from "@/lib/conquistas/mapear";
import { EvolucaoExercicioClient } from "./EvolucaoExercicioClient";
import { EvolucaoGeral } from "./EvolucaoGeral";
import { evolucaoPorMusculo, evolucaoPorTreino } from "@/lib/relatorios/evolucao-geral";
import { relatorioPremium } from "@/lib/relatorios/premium";
import type { TreinoComExercicios } from "@/lib/data/programas";

type Props = {
  modo: "aluno" | "treinador";
  dias: number;
  basePath: string; // para os links de período
  sessoes: SessaoCompleta[];
  programa: Programa | null;
  treinos: TreinoComExercicios[];
  evolucao: Evolucao[];
  checkIns: CheckIn[];
  versoes: ProgramaVersao[];
  comentarioTreinador?: { texto: string; autor: string; data: string } | null;
  exportarHref?: string | null;
  /** Aderência (para regularidade) e início do acompanhamento (para comparar períodos completos). */
  aderencia?: ResultadoAderencia | null;
  inicioAcompanhamento?: string | null;
  /** Só para o personal: pedidos de treino extra e decisões. */
  pedidosExtra?: Array<{ titulo: string; status: string; data: string; resposta: string | null }>;
  /** Resumo do histórico de outro app (só para o gráfico por exercício). */
  historicoResumo?: ResumoEvolucao[];
};

const PERIODOS = [7, 30, 90] as const;

export function RelatorioEvolucao({ modo, dias, basePath, sessoes, programa, treinos, evolucao, checkIns, versoes, comentarioTreinador, exportarHref, aderencia = null, inicioAcompanhamento = null, pedidosExtra, historicoResumo = [] }: Props) {
  const hojeLocal = dataLocal(new Date());
  const desdeLocal = somarDias(hojeLocal, -(dias - 1));
  const invisivel = evolucaoInvisivel({ sessoes: sessoes.map(sessaoParaConquista), aderencia, dias, hoje: hojeLocal, inicioAcompanhamento: inicioAcompanhamento ?? sessoes.map((x) => dataLocal(x.iniciado_em)).sort()[0] ?? hojeLocal });
  const det = detalheRelatorio(sessoes, desdeLocal, hojeLocal);
  const CHECKIN_ROT: Array<[keyof typeof det.checkin, string]> = [["muito_bem", "Muito bem"], ["normal", "Normal"], ["cansado", "Cansado"], ["desconforto", "Com desconforto"], ["prefiro_nao", "Prefiro não responder"], ["sem_resposta", "Sem resposta"]];
  const totalCheckin = Object.values(det.checkin).reduce((a, b) => a + b, 0);
  const resumo = resumoPeriodo(sessoes, programa?.frequencia, dias, new Date(), aderencia);
  const periodo = periodoDias(dias);
  const noPeriodo = sessoesNoPeriodo(sessoes, periodo);
  const calendario = calendarioSessoes(sessoes, periodo);
  // Só exercícios com carga/reps registradas (dias importados só com séries ficam de fora).
  const marcas = melhoresMarcas(noPeriodo.length ? noPeriodo : sessoes).filter((m) => m.melhorCarga || m.melhorReps || m.melhorE1rm).slice(0, 12);
  const grupoDe = new Map<string, string>();
  for (const x of sessoes) for (const e of x.exercicios) if (e.grupo_muscular) grupoDe.set(normalizarNome(e.nome), GRUPO_LABEL[e.grupo_muscular] ?? e.grupo_muscular);
  const exerciciosGrafico: Array<{ chave: string; nome: string; grupo?: string | null }> = [...marcas.map((m) => ({ chave: m.chave, nome: m.exercicio, grupo: grupoDe.get(m.chave) ?? null }))];
  for (const r of historicoResumo) {
    const chave = normalizarNome(r.exercicio_nome);
    if (r.series > 0 && r.carga_max_kg != null && !exerciciosGrafico.some((e) => e.chave === chave)) exerciciosGrafico.push({ chave, nome: r.exercicio_nome, grupo: grupoDe.get(chave) ?? null });
  }

  // Volume programado (plano ativo) × realizado (média semanal no período)
  const diasVolume: DiaVolume[] = treinos.filter((t) => t.ativo).map((t) => ({
    letra: t.letra,
    nome: t.nome,
    exercicios: t.exercicios.map((e) => ({ id: e.id, nome: e.nome, grupo: e.grupo_muscular ?? "nao_classificado", series: e.series, seriesAquecimento: e.series_aquecimento, tecnica: e.tecnica, contaVolume: e.conta_volume })),
  }));
  const programado = calcularVolumeSemanal(diasVolume, { frequencia: programa?.frequencia ?? {}, metas: programa?.metas_volume ?? {} });
  const semanas = Math.max(1, dias / 7);
  const realizadoBruto = volumeRealizadoPorGrupo(seriesRealizadasPorGrupo(sessoes, periodo));
  const realizadoSemanal = Object.fromEntries(Object.entries(realizadoBruto).map(([g, v]) => [g, Math.round(((v ?? 0) / semanas) * 10) / 10]));
  const comparacao = compararProgramadoRealizado(programado, realizadoSemanal).filter((c) => c.programado > 0 || c.realizado > 0);

  const ciPeriodo = checkIns.filter((c) => new Date(c.data).getTime() >= periodo.inicio.getTime());
  const media = (k: keyof CheckIn) => {
    const v = ciPeriodo.map((c) => c[k]).filter((x): x is number => typeof x === "number");
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
  };
  const dorAlta = ciPeriodo.filter((c) => (c.dor ?? 0) >= 7).length;
  const sessoesComDor = noPeriodo.filter((s) => s.feedback_percepcao === "dor").length;

  const emAlta = cargasEmAlta(sessoes, historicoResumo, 3);
  const pesos = evolucao.map((e) => e.peso_kg).filter((v): v is number => typeof v === "number");
  const cinturas = evolucao.map((e) => e.cintura_cm).filter((v): v is number => typeof v === "number");
  const medidas = evolucao.slice(-6);
  const primeira = evolucao[0];
  const ultima = evolucao.at(-1);

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Período do relatório">
        {PERIODOS.map((p) => (
          <Link key={p} href={`${basePath}?dias=${p}${modo === "treinador" ? "#evolucao" : ""}`} aria-current={dias === p ? "true" : undefined} className={`touch inline-flex items-center rounded-full border px-4 text-sm font-semibold ${dias === p ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted hover:text-fg"}`}>
            {p} dias
          </Link>
        ))}
        {exportarHref ? (
          <a href={exportarHref} className="alvo ml-auto text-xs text-fg-muted underline-offset-2 hover:underline hover:text-fg">
            Exportar registros (CSV)
          </a>
        ) : null}
      </div>

      {/* NÍVEL 1 — Resumo */}
      <Card className="border-accent/30">
        <CardBody className="space-y-4">
          {!resumo.dadosSuficientes ? (
            <div className="text-center py-4">
              <p className="font-bold">Ainda não há dados suficientes</p>
              <p className="text-sm text-fg-muted mt-1">
                {resumo.sessoesFeitas === 0 ? `Nenhuma sessão concluída nos últimos ${dias} dias.` : `Só ${resumo.sessoesFeitas} sessão no período — o resumo fica mais confiável a partir de 2.`} Cada treino registrado alimenta este relatório.
              </p>
              {exerciciosGrafico.length ? <p className="text-sm text-fg-muted mt-2">O histórico do app anterior já está logo abaixo, em “Evolução das cargas”.</p> : null}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Metrica label="Sessões" valor={`${resumo.sessoesFeitas} / ${resumo.sessoesPlanejadas || "—"}`} hint="feitas / planejadas" />
              <Metrica label="Aderência" valor={resumo.aderencia !== null ? `${resumo.aderencia}%` : "—"} hint={`${resumo.aderenciaJanela ? `${resumo.aderenciaJanela} · ` : ""}${resumo.tendencia === "melhor" ? `▲ antes ${resumo.aderenciaAnterior}%` : resumo.tendencia === "pior" ? `▼ antes ${resumo.aderenciaAnterior}%` : resumo.tendencia === "igual" ? `≈ antes ${resumo.aderenciaAnterior}%` : "sem comparação"}`} tone={resumo.tendencia === "melhor" ? "success" : resumo.tendencia === "pior" ? "warning" : "neutral"} />
              <Metrica label="Séries" valor={`${resumo.seriesFeitas} / ${resumo.seriesPlanejadas}`} hint="feitas / propostas" />
            </div>
          )}
          {resumo.conquistas.length ? (
            <ul className="space-y-2" aria-label="Conquistas reais do período">
              {resumo.conquistas.map((c, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-success/30 bg-success/5 px-3 py-2">
                  <span className="text-success font-bold" aria-hidden>✓</span>
                  <div>
                    <p className="text-sm font-semibold">{c.titulo}</p>
                    <p className="text-xs text-fg-muted">{c.detalhe}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {emAlta.length ? (
            <section className="space-y-2" aria-labelledby="cargas-alta-titulo">
              <h3 id="cargas-alta-titulo" className="text-[11px] font-bold uppercase tracking-wider text-accent">Cargas em alta</h3>
              <CargasEmAltaLista itens={emAlta} />
              <p className="text-[11px] text-fg-subtle">Carga máxima registrada por dia, do primeiro registro ao mais recente. Só aparecem exercícios em que ela subiu.</p>
            </section>
          ) : null}
          {invisivel.length ? (
            <section className="space-y-2" aria-labelledby="invisivel-titulo">
              <h3 id="invisivel-titulo" className="text-[11px] font-bold uppercase tracking-wider text-accent">Evoluções que você não percebeu</h3>
              {invisivel.slice(0, modo === "aluno" ? 2 : 6).map((i) => (
                <div key={i.tipo} className="rounded-lg border border-border px-3 py-2 text-sm space-y-1">
                  <p className="font-semibold">{i.titulo}</p>
                  <p><span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Dado · </span>{i.dado}</p>
                  <p className="text-fg-muted"><span className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">Interpretação · </span>{i.interpretacao}</p>
                  <details className="text-[11px] text-fg-subtle"><summary className="cursor-pointer font-semibold text-accent">Por que isso é importante?</summary><p className="mt-1 text-fg-muted">{POR_QUE_INVISIVEL[i.tipo]}</p><p className="mt-1">Como é calculado: {i.criterio}</p></details>
                </div>
              ))}
              {modo === "aluno" && invisivel.length > 2 ? <p className="text-[11px] text-fg-subtle">+{invisivel.length - 2} na análise completa.</p> : null}
            </section>
          ) : null}
          {modo === "aluno" ? <ChamadaTrofeu acao="relatorio" /> : null}
          <a href="#analise" className="inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline min-h-6 py-0.5">
            {modo === "aluno" ? "Ver minha evolução completa ↓" : "Ver análise completa ↓"}
          </a>
          {comentarioTreinador ? (
            <blockquote className="rounded-lg border-l-2 border-accent bg-accent-soft/50 px-3 py-2 text-sm">
              <p>{comentarioTreinador.texto}</p>
              <footer className="text-[11px] text-fg-subtle mt-1">
                {comentarioTreinador.autor} · {dataBR(comentarioTreinador.data)}
              </footer>
            </blockquote>
          ) : null}
        </CardBody>
      </Card>

      {historicoResumo.length && exerciciosGrafico.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução das cargas</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-xs text-fg-muted">
              Inclui o histórico do app anterior ({dataBR(historicoResumo.map((r) => r.data).sort()[0])} a {dataBR(historicoResumo.map((r) => r.data).sort().at(-1)!)}, {new Set(historicoResumo.filter((r) => r.series > 0).map((r) => r.data)).size} dias de treino). Escolha o exercício:
            </p>
            <EvolucaoExercicioClient sessoes={sessoes} resumos={historicoResumo} exercicios={exerciciosGrafico} />
          </CardBody>
        </Card>
      ) : null}

      {/* Evolução geral: cada treino e cada músculo (prioridades em destaque) */}
      <EvolucaoGeral
        treinos={evolucaoPorTreino(sessoes, desdeLocal, hojeLocal)}
        musculos={evolucaoPorMusculo({ sessoes, inicio: desdeLocal, fim: hojeLocal, prioridades: programa?.prioridades ?? [], grupos: relatorioPremium({ sessoes, resumos: historicoResumo, inicio: desdeLocal, fim: hojeLocal }).grupos })}
      />

      {/* NÍVEL 2 — Detalhes */}
      <h2 id="analise" className="scroll-mt-20 text-xs font-bold uppercase tracking-wider text-fg-muted pt-1">Análise completa</h2>

      {modo === "aluno" && invisivel.length > 2 ? (
        <Acordeao titulo="Evoluções que você não percebeu" resumo={`${invisivel.length} sinais de progresso nos seus registros`}>
          <ul className="space-y-2">
            {invisivel.map((i) => (
              <li key={i.tipo} className="text-sm">
                <p className="font-semibold">{i.titulo}</p>
                <p>Dado: {i.dado}</p>
                <p className="text-fg-muted">Interpretação: {i.interpretacao}</p>
              </li>
            ))}
          </ul>
        </Acordeao>
      ) : null}

      <Acordeao titulo="Tempo de treino" resumo={det.tempo ? `média de ${det.tempo.mediaRealMin} min por treino` : "dados insuficientes"}>
        {det.tempo ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metrica label="Duração real" valor={`${det.tempo.mediaRealMin} min`} hint={`média de ${det.tempo.sessoes} ${det.tempo.sessoes === 1 ? "treino" : "treinos"}`} />
              <Metrica label="Planejado" valor={det.tempo.mediaPlanejadaMin != null ? `${det.tempo.mediaPlanejadaMin} min` : "—"} hint={det.tempo.comparaveis ? `${det.tempo.comparaveis} com estimativa` : "sem estimativa"} />
              <Metrica label="Dentro do previsto" valor={det.tempo.dentroDoPrevisto != null ? `${det.tempo.dentroDoPrevisto}/${det.tempo.comparaveis}` : "—"} hint="diferença até 15%" />
              <Metrica label="Descanso típico" valor={det.descansoMedianoSeg != null ? `${Math.floor(det.descansoMedianoSeg / 60)}:${String(det.descansoMedianoSeg % 60).padStart(2, "0")}` : "—"} hint={det.descansoMedianoSeg != null ? `mediana de ${det.intervalosDescanso} intervalos` : "poucos dados"} />
            </div>
            <p className="text-[11px] text-fg-subtle">Duração real = início ao fim do treino menos as pausas registradas. Descanso típico só aparece com 10+ intervalos entre séries marcadas na hora; séries anotadas depois não entram. A estimativa é orientativa — o importante é a execução, não o relógio.</p>
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Ainda não há treinos suficientes com início e fim registrados no período (mínimo 2).</p>
        )}
      </Acordeao>

      <Acordeao titulo="Séries, extras e versões reduzidas" resumo={`${det.series.feitas}/${det.series.planejadas} séries · ${det.extras.sessoes} extra(s) · ${det.reduzidas.sessoes} reduzida(s)`}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metrica label="Séries do programa" valor={`${det.series.feitas}/${det.series.planejadas}`} hint="feitas / prescritas" />
          <Metrica label="Treinos extras" valor={String(det.extras.sessoes)} hint={det.extras.minutos ? `${det.extras.minutos} min no total` : "fora da meta"} />
          <Metrica label="Séries extras" valor={String(det.extras.series)} hint="entram no volume" />
          <Metrica label="Versões reduzidas" valor={String(det.reduzidas.sessoes)} hint={det.reduzidas.exerciciosAdiados ? `${det.reduzidas.exerciciosAdiados} exercício(s) adiados` : "por tempo disponível"} />
        </div>
        <p className="text-[11px] text-fg-subtle mt-2">Extras ficam fora da meta semanal e da aderência, mas o volume real entra nos relatórios. Versões reduzidas seguem as regras do personal.</p>
        {modo === "treinador" && pedidosExtra?.length ? (
          <ul className="mt-2 space-y-1 text-xs">
            {pedidosExtra.map((p, i) => (
              <li key={i} className="text-fg-muted">
                {dataBR(p.data)} · <span className="text-fg">{p.titulo}</span> · {p.status === "aprovada" ? "aprovado" : p.status === "recusada" ? "não aprovado" : "pendente"}{p.resposta ? ` — “${p.resposta}”` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </Acordeao>

      <Acordeao titulo="Disposição antes do treino" resumo={totalCheckin ? `${totalCheckin - det.checkin.sem_resposta} de ${totalCheckin} com resposta` : "sem treinos no período"}>
        {totalCheckin ? (
          <ul className="space-y-1.5">
            {CHECKIN_ROT.filter(([k]) => det.checkin[k] > 0).map(([k, rot]) => (
              <li key={k} className="flex items-center gap-2 text-sm">
                <span className="w-40 shrink-0 text-fg-muted">{rot}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-border" aria-hidden>
                  <span className={`block h-full rounded-full ${k === "desconforto" ? "bg-warning" : "bg-accent"}`} style={{ width: `${(det.checkin[k] / totalCheckin) * 100}%` }} />
                </span>
                <span className="w-8 text-right font-mono">{det.checkin[k]}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Sem treinos no período.</p>
        )}
        <p className="text-[11px] text-fg-subtle mt-2">Resposta opcional antes de começar. Mostra tendências, não diagnóstico; não substitui avaliação profissional.</p>
      </Acordeao>

      <Acordeao titulo="Interrupções e retomadas" resumo={det.interrupcoes.length ? `${det.interrupcoes.length} no período` : "nenhuma no período"}>
        {det.interrupcoes.length ? (
          <ul className="space-y-1 text-sm">
            {det.interrupcoes.map((x) => (
              <li key={x.de}>
                {dataBR(x.de)} → {dataBR(x.ate)}: <span className="text-fg-muted">{x.dias} dias sem treino registrado, com retomada em {dataBR(x.ate)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Nenhum intervalo de 14 dias ou mais sem treino no período.</p>
        )}
        <p className="text-[11px] text-fg-subtle mt-2">Pausas combinadas (férias, lesão) aparecem no calendário de consistência e não contam como falta.</p>
      </Acordeao>

      <Acordeao titulo="Frequência e aderência" resumo={`${calendario.filter((d) => d.status === "feito").length} ${calendario.filter((d) => d.status === "feito").length === 1 ? "dia" : "dias"} com treino · ${calendario.filter((d) => d.status === "abandonado").length} encerrado(s) sem concluir`}>
        <Heatmap dias={calendario.map((d) => ({ data: d.data, intensidade: d.status === "feito" ? 3 : d.status === "abandonado" ? 1 : 0, tooltip: `${dataBR(d.data)} — ${d.status === "feito" ? `treino ${d.letra ?? ""}${d.duracaoMin ? ` (${d.duracaoMin} min)` : ""}` : d.status === "abandonado" ? "encerrado sem concluir" : "sem treino"}` }))} />
        <div className="flex items-center justify-between mt-3 text-xs text-fg-subtle">
          <span>Meta semanal do programa: {Math.round(Object.values(programa?.frequencia ?? {}).reduce((a, b) => a + (Number(b) || 0), 0)) || "—"} sessões</span>
          <HeatmapLegend />
        </div>
        {resumo.duracaoMediaMin ? <p className="text-xs text-fg-muted mt-2">Duração média: {resumo.duracaoMediaMin} min por sessão.</p> : null}
      </Acordeao>

      <Acordeao titulo="Força e desempenho" resumo={marcas.length ? `${marcas.length} ${marcas.length === 1 ? "exercício" : "exercícios"} com registro` : exerciciosGrafico.length ? "histórico do app anterior" : "sem registros no período"}>
        {marcas.length === 0 ? (
          <>
            <p className="text-sm text-fg-muted">Registre cargas e repetições durante o treino para ver suas melhores marcas aqui.</p>
            {exerciciosGrafico.length ? <p className="text-xs text-fg-subtle">O histórico do app anterior está em “Evolução das cargas”, acima.</p> : null}
          </>
        ) : (
          <>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-fg-subtle">
                  <tr>
                    <th className="text-left font-semibold px-1 py-1">Exercício</th>
                    <th className="text-right font-semibold px-1 py-1">Melhor carga</th>
                    <th className="text-right font-semibold px-1 py-1">Mais reps</th>
                    <th className="text-right font-semibold px-1 py-1" title="Estimativa de 1RM pela fórmula de Epley (válida entre 1 e 12 repetições)">
                      e1RM*
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {marcas.map((m) => (
                    <tr key={m.chave} className="border-t border-border">
                      <td className="px-1 py-1.5 font-medium">{m.exercicio}</td>
                      <td className="px-1 py-1.5 text-right font-mono">{m.melhorCarga ? `${m.melhorCarga.carga} kg × ${m.melhorCarga.reps}` : "—"}</td>
                      <td className="px-1 py-1.5 text-right font-mono">{m.melhorReps ? `${m.melhorReps.reps} × ${m.melhorReps.carga} kg` : "—"}</td>
                      <td className="px-1 py-1.5 text-right font-mono">{m.melhorE1rm ? `${m.melhorE1rm.valor} kg` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-fg-subtle mt-2">*e1RM = carga × (1 + reps ÷ 30) (Epley). Estimativa válida de 1 a 12 repetições; não é teste de força máxima nem indica hipertrofia.</p>
            <EvolucaoExercicioClient sessoes={sessoes} resumos={historicoResumo} exercicios={exerciciosGrafico} />
          </>
        )}
      </Acordeao>

      <Acordeao titulo="Volume: programado × realizado" resumo={comparacao.length ? `${comparacao.length} ${comparacao.length === 1 ? "grupo" : "grupos"} · média semanal no período` : "sem dados"}>
        {comparacao.length === 0 ? (
          <p className="text-sm text-fg-muted">Sem séries registradas no período.</p>
        ) : (
          <ul className="space-y-2.5" aria-label="Séries por semana: feito em relação ao programado">
            {comparacao.map((c) => {
              const escala = Math.max(c.programado, c.realizado, 1) * 1.15;
              return (
                <li key={c.grupo}>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span>{c.label}</span>
                    <span className="font-mono text-xs text-fg-muted">
                      <span className="font-semibold text-fg">{c.realizado.toLocaleString("pt-BR")}</span> de {c.programado.toLocaleString("pt-BR")}/sem
                      {c.aderencia !== null ? <span className={`ml-2 ${c.aderencia < 70 ? "text-warning" : ""}`}>{c.aderencia}%</span> : null}
                    </span>
                  </div>
                  <div className="relative mt-1 h-2 rounded-full bg-border/60" aria-hidden>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${(c.realizado / escala) * 100}%` }} />
                    {c.programado > 0 ? <div className="absolute -inset-y-1 w-0.5 rounded-full bg-fg-muted" style={{ left: `${(c.programado / escala) * 100}%` }} title={`Programado: ${c.programado}/sem`} /> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-fg-subtle mt-2">Barra dourada = feito por semana; traço = programado. Séries válidas (sem aquecimento), volume direto por músculo principal. Tonelagem no período: {tonelagem(noPeriodo).toLocaleString("pt-BR")} kg — compare apenas os mesmos exercícios.</p>
      </Acordeao>

      <Acordeao titulo="Recuperação e percepção" resumo={ciPeriodo.length ? `${ciPeriodo.length} ${ciPeriodo.length === 1 ? "check-in" : "check-ins"}` : "sem check-ins no período"}>
        {ciPeriodo.length === 0 && sessoesComDor === 0 ? (
          <p className="text-sm text-fg-muted">Sem dados autorrelatados no período.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metrica label="Energia" valor={media("energia")?.toString() ?? "—"} hint="média 1–10" />
            <Metrica label="Sono" valor={media("sono")?.toString() ?? "—"} hint="média 1–10" />
            <Metrica label="Dor/desconforto" valor={media("dor")?.toString() ?? "—"} hint={dorAlta ? `${dorAlta} dia(s) ≥ 7` : "média 1–10"} tone={dorAlta ? "warning" : "neutral"} />
            <Metrica label="Treinos com dor" valor={String(sessoesComDor)} hint="autorrelato" tone={sessoesComDor ? "warning" : "neutral"} />
          </div>
        )}
        <p className="text-[11px] text-fg-subtle mt-2">Dados autorrelatados, sem diagnóstico. Servem para conversa com o treinador, não para conclusões clínicas.</p>
      </Acordeao>

      <Acordeao titulo="Medidas corporais" resumo={ultima ? `última: ${dataBR(ultima.data)}` : "sem medidas"}>
        {medidas.length === 0 ? (
          <p className="text-sm text-fg-muted">Nenhuma medida registrada.</p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-fg-subtle">
                  <tr>
                    <th className="text-left px-1 py-1">Data</th>
                    <th className="text-right px-1 py-1">Peso</th>
                    <th className="text-right px-1 py-1">Cintura</th>
                    <th className="text-right px-1 py-1">Quadril</th>
                    <th className="text-right px-1 py-1">Coxa</th>
                    <th className="text-right px-1 py-1">Braço</th>
                  </tr>
                </thead>
                <tbody>
                  {medidas.map((m) => (
                    <tr key={m.id} className="border-t border-border font-mono">
                      <td className="px-1 py-1.5 font-sans">{dataBR(m.data)}</td>
                      <td className="px-1 py-1.5 text-right">{m.peso_kg ?? "—"}</td>
                      <td className="px-1 py-1.5 text-right">{m.cintura_cm ?? "—"}</td>
                      <td className="px-1 py-1.5 text-right">{m.quadril_cm ?? "—"}</td>
                      <td className="px-1 py-1.5 text-right">{m.coxa_cm ?? "—"}</td>
                      <td className="px-1 py-1.5 text-right">{m.braco_cm ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pesos.length >= 3 || cinturas.length >= 3 ? (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {pesos.length >= 3 ? (
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <span>Peso</span>
                    <Sparkline valores={pesos} largura={96} altura={26} />
                    <span className="font-mono text-fg">{pesos.at(-1)!.toLocaleString("pt-BR")} kg</span>
                  </div>
                ) : null}
                {cinturas.length >= 3 ? (
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <span>Cintura</span>
                    <Sparkline valores={cinturas} largura={96} altura={26} />
                    <span className="font-mono text-fg">{cinturas.at(-1)!.toLocaleString("pt-BR")} cm</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            {primeira && ultima && primeira.id !== ultima.id ? (
              <p className="text-xs text-fg-muted mt-2">
                Desde {dataBR(primeira.data)}: peso {delta(primeira.peso_kg, ultima.peso_kg, "kg")} · cintura {delta(primeira.cintura_cm, ultima.cintura_cm, "cm")}. Variações pequenas são normais (hidratação, horário, ciclo).
              </p>
            ) : null}
          </>
        )}
      </Acordeao>

      <Acordeao titulo="Histórico do plano" resumo={versoes.length ? `${versoes.length} versão(ões)` : "sem versões"}>
        {versoes.length === 0 ? (
          <p className="text-sm text-fg-muted">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ol className="space-y-2">
            {versoes.map((v) => (
              <li key={v.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Versão {v.versao}</p>
                  <p className="text-[11px] text-fg-subtle">{dataBR(v.created_at)}</p>
                </div>
                {v.motivo ? <p className="text-sm text-fg-muted mt-0.5">{v.motivo}</p> : null}
                {v.diff_resumo ? <p className="text-xs text-fg-subtle mt-0.5">{v.diff_resumo}</p> : null}
                {modo === "treinador" ? (
                  <p className="text-xs text-fg-subtle mt-1">
                    {v.snapshot?.treinos?.filter((t) => t.ativo).length ?? 0} {(v.snapshot?.treinos?.filter((t) => t.ativo).length ?? 0) === 1 ? "treino" : "treinos"} · {v.snapshot?.treinos?.reduce((n, t) => n + t.exercicios.reduce((m, e) => m + (e.series || 0), 0), 0) ?? 0} séries/ciclo
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Acordeao>
    </div>
  );
}

function Metrica({ label, valor, hint, tone = "neutral" }: { label: string; valor: string; hint?: string; tone?: "neutral" | "success" | "warning" }) {
  const cor = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-fg-subtle";
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-1 text-lg font-black text-fg font-mono">{valor}</div>
      {hint ? <div className={`text-[10px] mt-0.5 ${cor}`}>{hint}</div> : null}
    </div>
  );
}

function delta(a: number | null | undefined, b: number | null | undefined, unidade: string): string {
  if (a == null || b == null) return "—";
  const d = Math.round((b - a) * 10) / 10;
  return `${d > 0 ? "+" : ""}${d} ${unidade}`;
}

export { CardHeader, CardTitle };
