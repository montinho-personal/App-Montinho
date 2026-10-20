// ============================================================================
// Painel “Evoluções dos alunos” (personal): descobertas recentes confiáveis,
// mudança de aderência, falta de dados e pontos que merecem revisão — com os
// registros que fundamentam cada item. Nunca recomenda aumentar carga,
// volume ou frequência; ausência de recorde não é ausência de evolução.
// ============================================================================

import { dataLocal, somarDias, tendencia, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { dorNaSessao, execucoesDeSessoes, sessaoParaAvaliar } from "./adaptar";
import { descobertasDaSessao, type Descoberta } from "./motor";

export type LinhaPainelEvolucao = {
  descobertas: Array<Descoberta & { dia: string; sessaoId: string }>;
  aderencia28: number | null;
  tendencia: number | null;
  dadosInsuficientes: boolean;
  revisar: string[];
  sessoes14: number;
};

export function painelDoAluno(sessoes: SessaoCompleta[], aderencia: Pick<ResultadoAderencia, "semanas" | "indices">, hoje: string, dias = 14): LinhaPainelEvolucao {
  const desde = somarDias(hoje, -(dias - 1));
  const fin = sessoes.filter((s) => s.status !== "em_andamento");
  const recentes = fin.filter((s) => s.conta_aderencia !== false && dataLocal(s.iniciado_em) >= desde);
  const execs = execucoesDeSessoes(fin);
  const descobertas = recentes
    .flatMap((s) => descobertasDaSessao(sessaoParaAvaliar(s), execs.filter((h) => h.sessaoId !== s.id)).filter((d) => d.confianca === "alta").map((d) => ({ ...d, dia: dataLocal(s.iniciado_em), sessaoId: s.id })))
    .sort((a, b) => (a.dia < b.dia ? 1 : -1));
  const comCarga28 = fin.filter((s) => dataLocal(s.iniciado_em) >= somarDias(hoje, -27) && s.exercicios.some((e) => e.series.some((x) => (x.carga_kg ?? 0) > 0 && (x.reps ?? 0) > 0))).length;
  const t = tendencia(aderencia as ResultadoAderencia);
  const revisar: string[] = [];
  const comDor = recentes.filter(dorNaSessao).length;
  if (comDor) revisar.push(`${comDor} ${comDor === 1 ? "sessão" : "sessões"} com dor ou desconforto relatado em ${dias} dias.`);
  if (t != null && t <= -20) revisar.push(`Aderência ${Math.abs(t)} pontos abaixo das 4 semanas anteriores.`);
  return { descobertas, aderencia28: aderencia.indices.d28.pct, tendencia: t, dadosInsuficientes: comCarga28 < 2, revisar, sessoes14: recentes.length };
}
