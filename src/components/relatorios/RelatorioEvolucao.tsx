// Relatório de evolução em duas camadas (resumo → análise detalhada).
// Server Component: recebe os dados já autorizados pela página que o chama.
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Heatmap, HeatmapLegend } from "@/components/ui/Heatmap";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import type { Programa, ProgramaVersao } from "@/lib/supabase/types-sessoes";
import type { Evolucao } from "@/lib/supabase/types";
import type { CheckIn } from "@/lib/supabase/types-extended";
import { calcularVolumeSemanal, compararProgramadoRealizado, volumeRealizadoPorGrupo, type DiaVolume } from "@/lib/volume/calcular";
import { calendarioSessoes, melhoresMarcas, periodoDias, resumoPeriodo, seriesRealizadasPorGrupo, sessoesNoPeriodo, tonelagem } from "@/lib/relatorios/calcular";
import { dataBR } from "@/lib/format";
import { Acordeao } from "./Acordeao";
import { EvolucaoExercicioClient } from "./EvolucaoExercicioClient";
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
};

const PERIODOS = [7, 30, 90] as const;

export function RelatorioEvolucao({ modo, dias, basePath, sessoes, programa, treinos, evolucao, checkIns, versoes, comentarioTreinador, exportarHref }: Props) {
  const resumo = resumoPeriodo(sessoes, programa?.frequencia, dias);
  const periodo = periodoDias(dias);
  const noPeriodo = sessoesNoPeriodo(sessoes, periodo);
  const calendario = calendarioSessoes(sessoes, periodo);
  const marcas = melhoresMarcas(noPeriodo.length ? noPeriodo : sessoes).slice(0, 12);

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

  const medidas = evolucao.slice(-6);
  const primeira = evolucao[0];
  const ultima = evolucao.at(-1);

  return (
    <div className="space-y-5">
      {/* Período */}
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Período do relatório">
        {PERIODOS.map((p) => (
          <Link key={p} href={`${basePath}?dias=${p}`} aria-current={dias === p ? "true" : undefined} className={`touch inline-flex items-center rounded-full border px-4 text-sm font-semibold ${dias === p ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted hover:text-fg"}`}>
            {p} dias
          </Link>
        ))}
        {exportarHref ? (
          <a href={exportarHref} className="ml-auto text-xs text-fg-muted underline-offset-2 hover:underline hover:text-fg">
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
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Metrica label="Sessões" valor={`${resumo.sessoesFeitas} / ${resumo.sessoesPlanejadas || "—"}`} hint="feitas / planejadas" />
              <Metrica label="Aderência" valor={resumo.aderencia !== null ? `${resumo.aderencia}%` : "—"} hint={resumo.tendencia === "melhor" ? `▲ antes ${resumo.aderenciaAnterior}%` : resumo.tendencia === "pior" ? `▼ antes ${resumo.aderenciaAnterior}%` : resumo.tendencia === "igual" ? `≈ antes ${resumo.aderenciaAnterior}%` : "sem comparação"} tone={resumo.tendencia === "melhor" ? "success" : resumo.tendencia === "pior" ? "warning" : "neutral"} />
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

      {/* NÍVEL 2 — Detalhes */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted pt-1">Análise completa</h2>

      <Acordeao titulo="Frequência e aderência" resumo={`${calendario.filter((d) => d.status === "feito").length} dias com treino · ${calendario.filter((d) => d.status === "abandonado").length} encerrado(s) sem concluir`}>
        <Heatmap dias={calendario.map((d) => ({ data: d.data, intensidade: d.status === "feito" ? 3 : d.status === "abandonado" ? 1 : 0, tooltip: `${dataBR(d.data)} — ${d.status === "feito" ? `treino ${d.letra ?? ""}${d.duracaoMin ? ` (${d.duracaoMin} min)` : ""}` : d.status === "abandonado" ? "encerrado sem concluir" : "sem treino"}` }))} />
        <div className="flex items-center justify-between mt-3 text-xs text-fg-subtle">
          <span>Meta semanal do programa: {Math.round(Object.values(programa?.frequencia ?? {}).reduce((a, b) => a + (Number(b) || 0), 0)) || "—"} sessões</span>
          <HeatmapLegend />
        </div>
        {resumo.duracaoMediaMin ? <p className="text-xs text-fg-muted mt-2">Duração média: {resumo.duracaoMediaMin} min por sessão.</p> : null}
      </Acordeao>

      <Acordeao titulo="Força e desempenho" resumo={marcas.length ? `${marcas.length} exercícios com registro` : "sem registros no período"}>
        {marcas.length === 0 ? (
          <p className="text-sm text-fg-muted">Registre cargas e repetições durante o treino para ver suas melhores marcas aqui.</p>
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
            <EvolucaoExercicioClient sessoes={sessoes} exercicios={marcas.map((m) => ({ chave: m.chave, nome: m.exercicio }))} />
          </>
        )}
      </Acordeao>

      <Acordeao titulo="Volume: programado × realizado" resumo={comparacao.length ? `${comparacao.length} grupos · média semanal no período` : "sem dados"}>
        {comparacao.length === 0 ? (
          <p className="text-sm text-fg-muted">Sem séries registradas no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-fg-subtle">
              <tr>
                <th className="text-left font-semibold py-1">Grupo</th>
                <th className="text-right font-semibold py-1">Programado/sem</th>
                <th className="text-right font-semibold py-1">Realizado/sem</th>
                <th className="text-right font-semibold py-1">%</th>
              </tr>
            </thead>
            <tbody>
              {comparacao.map((c) => (
                <tr key={c.grupo} className="border-t border-border">
                  <td className="py-1.5">{c.label}</td>
                  <td className="py-1.5 text-right font-mono">{c.programado}</td>
                  <td className="py-1.5 text-right font-mono">{c.realizado}</td>
                  <td className={`py-1.5 text-right font-mono ${c.aderencia !== null && c.aderencia < 70 ? "text-warning" : ""}`}>{c.aderencia !== null ? `${c.aderencia}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-[11px] text-fg-subtle mt-2">Séries válidas (sem aquecimento), volume direto por músculo principal. Tonelagem no período: {tonelagem(noPeriodo).toLocaleString("pt-BR")} kg — compare apenas os mesmos exercícios.</p>
      </Acordeao>

      <Acordeao titulo="Recuperação e percepção" resumo={ciPeriodo.length ? `${ciPeriodo.length} check-ins` : "sem check-ins no período"}>
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
                    {v.snapshot?.treinos?.filter((t) => t.ativo).length ?? 0} treinos · {v.snapshot?.treinos?.reduce((n, t) => n + t.exercicios.reduce((m, e) => m + (e.series || 0), 0), 0) ?? 0} séries/ciclo
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
