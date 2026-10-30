// ============================================================================
// Semanas completas e Semana Perfeita (pedido do Montinho, 30/10/2026).
//  • Semanas Completas (5, 10, 25, 50): semanas com 100% da meta de treinos
//    cumprida, contadas no TOTAL — não precisam ser seguidas (a sequência já
//    tem os troféus de semanas seguidas). Mesma conta da aderência
//    (`status === "cumprida"`, meta do protocolo vigente na segunda-feira).
//  • Semana Perfeita (1ª, 5, 10): semana cumprida em que TODOS os treinos do
//    plano feitos nela tiveram 100% das séries planejadas (nenhum parcial).
//    Treino extra/livre não entra (nem ajuda nem atrapalha); treino cancelado
//    sem séries não conta.
// O troféu sai na data do último treino da semana que fechou o marco.
// ============================================================================
import { classificarSessao, dataLocal, somarDias, type Semana, type SessaoAderencia } from "@/lib/aderencia/calcular";

export const MARCOS_SEMANAS_COMPLETAS = [5, 10, 25, 50] as const;
export const MARCOS_SEMANA_PERFEITA = [1, 5, 10] as const;
export type CodigoSemanasCompletas = "semanas_completas_5" | "semanas_completas_10" | "semanas_completas_25" | "semanas_completas_50" | "semana_perfeita" | "semana_perfeita_5" | "semana_perfeita_10";
export const CODIGOS_SEMANAS_COMPLETAS: CodigoSemanasCompletas[] = [...MARCOS_SEMANAS_COMPLETAS.map((n) => `semanas_completas_${n}` as CodigoSemanasCompletas), "semana_perfeita", "semana_perfeita_5", "semana_perfeita_10"];
export const codigoPerfeita = (n: number): CodigoSemanasCompletas => (n === 1 ? "semana_perfeita" : (`semana_perfeita_${n}` as CodigoSemanasCompletas));

type SessaoSemana = SessaoAderencia & { id: string; conta_aderencia?: boolean | null; origem?: string | null };
export type TrofeuSemanas = { codigo: CodigoSemanasCompletas; data: string; sessaoId: string | null; descricao: string; evidencia: Record<string, unknown> };
export type ProgressoSemanas = { completas: number; perfeitas: number };

/** Treinos do plano (não extra) que contam na semana, em ordem. */
function treinosDaSemana(inicio: string, sessoes: SessaoSemana[]): SessaoSemana[] {
  const fim = somarDias(inicio, 6);
  return sessoes
    .filter((s) => s.conta_aderencia !== false && s.origem !== "importado")
    .filter((s) => { const d = dataLocal(s.iniciado_em); return d >= inicio && d <= fim; })
    .filter((s) => { const c = classificarSessao(s); return c === "concluida" || c === "parcial"; })
    .sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
}

const perfeita = (treinos: SessaoSemana[]) => treinos.length > 0 && treinos.every((s) => s.status !== "abandonada" && (s.series_planejadas ?? 0) > 0 && (s.series_concluidas ?? 0) >= (s.series_planejadas ?? 0));

function percorrer(semanas: Semana[], sessoes: SessaoSemana[]) {
  const out: TrofeuSemanas[] = [];
  let completas = 0;
  let perfeitas = 0;
  for (const w of semanas) {
    if (w.status !== "cumprida") continue;
    const treinos = treinosDaSemana(w.inicio, sessoes);
    const ultimo = treinos.at(-1);
    const data = ultimo?.iniciado_em ?? `${w.inicio}T15:00:00Z`;
    completas++;
    for (const n of MARCOS_SEMANAS_COMPLETAS) if (completas === n) out.push({ codigo: `semanas_completas_${n}` as CodigoSemanasCompletas, data, sessaoId: ultimo?.id ?? null, descricao: `${n} semanas com 100% da meta de treinos cumprida.`, evidencia: { semanas: n, ultimaSemana: w.inicio } });
    if (perfeita(treinos)) {
      perfeitas++;
      for (const n of MARCOS_SEMANA_PERFEITA) if (perfeitas === n) out.push({ codigo: codigoPerfeita(n), data, sessaoId: ultimo?.id ?? null, descricao: n === 1 ? `Semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}: meta cumprida e todas as séries de todos os treinos feitas.` : `${n} semanas perfeitas: meta cumprida e todas as séries feitas.`, evidencia: { semanas: n, ultimaSemana: w.inicio, treinos: treinos.length } });
    }
  }
  return { out, completas, perfeitas };
}

export function trofeusDeSemanasCompletas(semanas: Semana[], sessoes: SessaoSemana[]): TrofeuSemanas[] {
  return percorrer(semanas, sessoes).out;
}

export function progressoSemanasCompletas(semanas: Semana[], sessoes: SessaoSemana[]): ProgressoSemanas {
  const { completas, perfeitas } = percorrer(semanas, sessoes);
  return { completas, perfeitas };
}
