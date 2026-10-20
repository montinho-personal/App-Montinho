// Converte sessões persistidas no formato do motor de evolução.
// Sessão em andamento não entra como histórico; dor relatada marca a sessão
// como não comparável (o motor ignora).
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { dataLocal } from "@/lib/aderencia/calcular";
import type { ExecucaoAnterior, IdentidadeExercicio, SerieReg } from "./motor";

type ExercicioSessao = SessaoCompleta["exercicios"][number];

/** “normal” = sem técnica especial (mesma identidade). */
export const normalizarTecnica = (t: string | null | undefined): string | null => (t && t !== "normal" && t !== "nenhuma" ? t : null);

export const tecnicaDe = (e: Pick<ExercicioSessao, "prescricao">): string | null => {
  const p = e.prescricao as { tecnica?: string | null } | null;
  return normalizarTecnica(p?.tecnica);
};

// Exercício trocado pelo aluno: o vínculo com o slot do plano (exercicio_id) não vale para comparar cargas.
export const identidadeDe = (e: Pick<ExercicioSessao, "exercicio_id" | "biblioteca_id" | "nome" | "prescricao"> & { substituido_de?: unknown }): IdentidadeExercicio => ({ exercicioId: e.substituido_de ? null : e.exercicio_id, bibliotecaId: e.biblioteca_id, nome: e.nome, tecnica: tecnicaDe(e) });

export const seriesDe = (e: Pick<ExercicioSessao, "series">): SerieReg[] => e.series.map((x) => ({ serie: x.serie, tipo: x.tipo, carga: x.carga_kg, reps: x.reps, lado: x.lado }));

export const dorNaSessao = (s: Pick<SessaoCompleta, "feedback_percepcao" | "checkin_pre">) => s.feedback_percepcao === "dor" || s.checkin_pre === "desconforto";

/** Uma execução por exercício de cada sessão finalizada (histórico importado incluído: só tem carga quando o app anterior tinha). */
export function execucoesDeSessoes(sessoes: SessaoCompleta[]): ExecucaoAnterior[] {
  return sessoes
    .filter((s) => s.status !== "em_andamento")
    .flatMap((s) => s.exercicios.map((e) => ({ ...identidadeDe(e), sessaoId: s.id, data: s.finalizado_em ?? s.iniciado_em, dor: dorNaSessao(s), series: seriesDe(e) })));
}

export function sessaoParaAvaliar(s: SessaoCompleta) {
  return { sessaoId: s.id, data: s.finalizado_em ?? s.iniciado_em, dia: dataLocal(s.iniciado_em), dor: dorNaSessao(s), exercicios: s.exercicios.map((e) => ({ ...identidadeDe(e), series: seriesDe(e) })) };
}
