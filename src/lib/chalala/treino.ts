// ============================================================================
// Chalalá dentro do treino (PURO, testado).
//  • Frases oficiais do Montinho para cada momento.
//  • Orquestrador antispam: no máximo 2 recados do Chalalá por treino
//    (além das instruções técnicas e da celebração final), 1 por exercício
//    para o mesmo tipo, prioridade recorde > progressão > repetições > técnica.
//  • Incentivo de progressão (Cenário A): só com histórico real suficiente.
//  • Técnica avançada já prescrita: em qual série aparece o recado.
// Nada aqui altera prescrição, carga ou série: só decide SE e QUAL frase mostrar.
// ============================================================================

import { mesmaIdentidade, type ExecucaoAnterior, type IdentidadeExercicio, type TipoDescoberta } from "@/lib/evolucao/motor";
import { bonusTecnica, type EntradaTecnica } from "@/lib/volume/tecnicas";

export const FRASES = {
  inicio: "Bora treinar? O chalalá não vai acontecer sozinho!",
  progressao: "Essa carga merece um chalalá!",
  recorde: "Chalalá desbloqueado! Carga nova na conta!",
  repeticoes: "O peso é o mesmo, mas o chalalá evoluiu!",
  tecnica: "Achou que acabou? Tem um chalalá nessa última série!",
  dropset: "Última série com um chalalá especial: drop-set!",
  rest_pause: "Hoje o chalalá vem em forma de rest-pause.",
} as const;

// ---------------------------------------------------------------------------
// Orquestrador
// ---------------------------------------------------------------------------
export type TipoIntervencao = "recorde" | "progressao" | "repeticoes" | "tecnica";
export type Registro = { tipo: TipoIntervencao; exercicio: string };

export const LIMITES_CHALALA = { total: 2, recorde: 2, progressao: 1, repeticoes: 2, tecnica: 2 } as const;
export const PRIORIDADE: Record<TipoIntervencao, number> = { recorde: 4, progressao: 3, repeticoes: 2, tecnica: 1 };

export function podeIntervir(feitos: Registro[], tipo: TipoIntervencao, exercicio: string): boolean {
  if (feitos.length >= LIMITES_CHALALA.total) return false;
  if (feitos.filter((r) => r.tipo === tipo).length >= LIMITES_CHALALA[tipo]) return false;
  return !feitos.some((r) => r.tipo === tipo && r.exercicio === exercicio);
}

/** Vários candidatos no mesmo momento: só um aparece (o de maior prioridade permitido). */
export function escolherIntervencao(feitos: Registro[], candidatos: Array<{ tipo: TipoIntervencao; exercicio: string }>) {
  return [...candidatos].sort((a, b) => PRIORIDADE[b.tipo] - PRIORIDADE[a.tipo]).find((c) => podeIntervir(feitos, c.tipo, c.exercicio)) ?? null;
}

/** Descoberta do motor de evolução → frase do Chalalá (o texto factual continua junto). */
export function chalalaDaDescoberta(tipo: TipoDescoberta): { tipo: TipoIntervencao; frase: string } | null {
  if (tipo === "recorde_carga") return { tipo: "recorde", frase: FRASES.recorde };
  if (tipo === "mais_reps" || tipo === "recorde_reps") return { tipo: "repeticoes", frase: FRASES.repeticoes };
  return null;
}

// ---------------------------------------------------------------------------
// Técnica avançada prescrita
// ---------------------------------------------------------------------------
/** Frase para a técnica (só as que acontecem “no fim”: drop-set e rest-pause). */
export function fraseDaTecnica(tecnica: string | null | undefined): string | null {
  if (tecnica === "dropset") return FRASES.dropset;
  if (tecnica === "rest_pause") return FRASES.rest_pause;
  return null;
}

/**
 * Primeira série VÁLIDA (1 = primeira depois do aquecimento) que leva a técnica.
 * null quando a técnica vale para todas as séries (não há “chegar” nela) ou
 * quando não há técnica com recado.
 */
export function serieDaTecnica(ex: EntradaTecnica, validas: number): number | null {
  if (!fraseDaTecnica(ex.tecnica) || validas < 2) return null;
  const r = bonusTecnica(ex, validas, "classica");
  if (r.seriesComTecnica <= 0 || r.seriesComTecnica >= validas) return null;
  return validas - r.seriesComTecnica + 1;
}

// ---------------------------------------------------------------------------
// Progressão (Cenário A): duas sessões comparáveis, ≥ 14 dias, sem progresso
// ---------------------------------------------------------------------------
export const REGRAS_PROGRESSAO = { diasEntre: 14, diasMaxUltima: 21 } as const;

export type EntradaProgressao = {
  atual: IdentidadeExercicio;
  historico: ExecucaoAnterior[];
  /** Repetições prescritas (ex.: "8-12", "10", "12/10/8"). */
  repsPrescritas: string | null | undefined;
  /** Data de hoje (AAAA-MM-DD). */
  hoje: string;
  dorHoje?: boolean;
  /** Restrição registrada / exercício em manutenção / personal desligou avisos. */
  bloqueado?: boolean;
  /** Já mostrado para este exercício nos últimos 14 dias. */
  mostradoRecente?: boolean;
};
export type ResultadoProgressao = { ok: true; carga: number; reps: number; semanas: number } | { ok: false; motivo: string };

const dias = (a: string, b: string) => Math.round((Date.parse(`${a.slice(0, 10)}T12:00:00Z`) - Date.parse(`${b.slice(0, 10)}T12:00:00Z`)) / 86_400_000);
const repsMinimas = (p: string | null | undefined): number | null => {
  const nums = (p ?? "").match(/\d+/g)?.map(Number).filter((n) => n > 0) ?? [];
  return nums.length ? Math.min(...nums) : null;
};

export function avaliarProgressao(e: EntradaProgressao): ResultadoProgressao {
  if (e.dorHoje) return { ok: false, motivo: "dor_hoje" };
  if (e.bloqueado) return { ok: false, motivo: "bloqueado" };
  if (e.mostradoRecente) return { ok: false, motivo: "mostrado_recente" };
  const minimo = repsMinimas(e.repsPrescritas);
  if (!minimo) return { ok: false, motivo: "faixa_desconhecida" };

  const sessoes = e.historico
    .filter((h) => !h.dor && mesmaIdentidade(e.atual, h) !== "insuficiente")
    .map((h) => ({ data: h.data.slice(0, 10), series: h.series.filter((s) => s.tipo === "valida" && (s.carga ?? 0) > 0 && (s.reps ?? 0) > 0) as Array<{ carga: number; reps: number }> }))
    .filter((h) => h.series.length && h.data < e.hoje)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  if (sessoes.length < 2) return { ok: false, motivo: "historico_insuficiente" };
  const ult = sessoes[0];
  if (dias(e.hoje, ult.data) > REGRAS_PROGRESSAO.diasMaxUltima) return { ok: false, motivo: "ultima_antiga" };
  const base = sessoes.find((s) => dias(ult.data, s.data) >= REGRAS_PROGRESSAO.diasEntre);
  if (!base) return { ok: false, motivo: "sem_14_dias" };

  const maxCarga = (s: (typeof sessoes)[number]) => Math.max(...s.series.map((x) => x.carga));
  const melhorReps = (s: (typeof sessoes)[number], carga: number) => Math.max(0, ...s.series.filter((x) => x.carga === carga).map((x) => x.reps));
  const cargaBase = maxCarga(base);
  const janela = sessoes.filter((s) => s.data >= base.data);
  // Houve progresso em algum momento da janela? Então não é estagnação.
  if (janela.some((s) => maxCarga(s) > cargaBase)) return { ok: false, motivo: "progrediu_carga" };
  if (maxCarga(ult) !== cargaBase) return { ok: false, motivo: "carga_diferente" };
  if (janela.some((s) => s !== base && melhorReps(s, cargaBase) > melhorReps(base, cargaBase))) return { ok: false, motivo: "progrediu_reps" };
  // Meta cumprida: na última vez, todas as séries válidas bateram ao menos o mínimo prescrito.
  if (!ult.series.every((x) => x.reps >= minimo)) return { ok: false, motivo: "meta_nao_cumprida" };

  return { ok: true, carga: cargaBase, reps: melhorReps(ult, cargaBase), semanas: Math.max(2, Math.floor(dias(ult.data, base.data) / 7)) };
}

const kg = (n: number) => `${String(Math.round(n * 100) / 100).replace(".", ",")} kg`;

/** Texto curto do incentivo: convite, nunca ordem (o aluno decide). */
export function textoProgressao(r: Extract<ResultadoProgressao, { ok: true }>): string {
  return `Faz ${r.semanas} semanas que você está em ${kg(r.carga)} × ${r.reps} batendo as repetições. Se a execução estiver firme, dá pra tentar um pouco mais hoje.`;
}
