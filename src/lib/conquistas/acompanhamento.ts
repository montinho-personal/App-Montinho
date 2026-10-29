// ============================================================================
// Acompanhamento em meses e retomada depois de 1 mês (pedido do Montinho,
// 29/10/2026) — regras PURAS.
// • Meses: blocos de 30 dias contados a partir do 1º treino feito no app.
//   Um mês “conta” quando tem pelo menos 1 treino (concluído, parcial ou
//   extra). Não precisam ser seguidos, como as 12 semanas. 3, 6 e 12 meses.
// • Retomada de 1 mês: treino depois de 30 dias ou mais sem treinar. Repete
//   (uma por volta) e fica fora do ranking, como o “Eu voltei”.
// Treino importado de outro app e o que o personal tirou da aderência não contam.
// ============================================================================
import { classificarSessao, dataLocal, type SessaoAderencia } from "@/lib/aderencia/calcular";

export const MARCOS_MESES = [3, 6, 12] as const;
export const DIAS_DO_MES = 30;
export const DIAS_RETOMADA_LONGA = 30;
export type CodigoAcompanhamento = "acompanhamento_3_meses" | "acompanhamento_6_meses" | "acompanhamento_1_ano";
export const CODIGOS_ACOMPANHAMENTO: CodigoAcompanhamento[] = ["acompanhamento_3_meses", "acompanhamento_6_meses", "acompanhamento_1_ano"];
export const codigoDosMeses = (n: (typeof MARCOS_MESES)[number]): CodigoAcompanhamento => (n === 12 ? "acompanhamento_1_ano" : `acompanhamento_${n}_meses`) as CodigoAcompanhamento;

type SessaoTempo = SessaoAderencia & { conta_aderencia?: boolean | null };
export type TrofeuTempo = { codigo: CodigoAcompanhamento | "retomada_30"; referencia: string; data: string; sessaoId: string; descricao: string; evidencia: Record<string, unknown> };

const dias = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Treinos que contam, em ordem. */
function contam(sessoes: SessaoTempo[]): SessaoTempo[] {
  return sessoes
    .filter((s) => s.status !== "em_andamento" && s.origem !== "importado" && s.origem !== "legado_logbook" && s.conta_aderencia !== false && ["concluida", "parcial", "extra"].includes(classificarSessao(s)))
    .sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
}

/** Quantos meses (blocos de 30 dias) já tiveram treino. */
export function mesesComTreino(sessoes: SessaoTempo[]): number {
  const xs = contam(sessoes);
  if (!xs.length) return 0;
  const d0 = dataLocal(xs[0].iniciado_em);
  return new Set(xs.map((s) => Math.floor(dias(d0, dataLocal(s.iniciado_em)) / DIAS_DO_MES))).size;
}

export function trofeusDeTempo(sessoes: SessaoTempo[]): TrofeuTempo[] {
  const out: TrofeuTempo[] = [];
  const xs = contam(sessoes);
  if (!xs.length) return out;
  const d0 = dataLocal(xs[0].iniciado_em);
  const meses = new Set<number>();
  for (const s of xs) {
    const antes = meses.size;
    meses.add(Math.floor(dias(d0, dataLocal(s.iniciado_em)) / DIAS_DO_MES));
    if (meses.size === antes) continue;
    for (const n of MARCOS_MESES) {
      if (meses.size === n) out.push({ codigo: codigoDosMeses(n), referencia: "1", data: s.iniciado_em, sessaoId: s.id, descricao: n === 12 ? "1 ano de acompanhamento: 12 meses com treino no app." : `${n} meses de acompanhamento com treino no app.`, evidencia: { meses: n, desde: d0 } });
    }
  }
  // Retomada de 1 mês (só treino concluído ou parcial: o extra não é “voltar ao plano”).
  const validas = xs.filter((s) => classificarSessao(s) !== "extra");
  for (let i = 1; i < validas.length; i++) {
    const a = dataLocal(validas[i - 1].iniciado_em);
    const b = dataLocal(validas[i].iniciado_em);
    const gap = dias(a, b);
    if (gap >= DIAS_RETOMADA_LONGA) out.push({ codigo: "retomada_30", referencia: b, data: validas[i].iniciado_em, sessaoId: validas[i].id, descricao: `De volta depois de ${gap} dias sem treinar.`, evidencia: { diasAfastado: gap } });
  }
  return out;
}
