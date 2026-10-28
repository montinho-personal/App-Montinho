// ============================================================================
// Combo em sequência (pedido do Montinho, 28/10/2026): dias SEGUIDOS (de
// calendário, horário de Brasília) com musculação e cardio no mesmo dia.
//  • Marcos: 3, 5, 7 e 10 dias; 30 dias é o troféu desafiador.
//  • Cardio do dia: 20 minutos ou mais, somando as partes do dia (cada parte
//    com 10+ min, como no resto do Montinho Cardio; “não realizado” não conta).
//  • Musculação: a mesma do carimbo (concluída, ou extra/livre com séries;
//    nada importado).
// Cada marco vale uma vez: a primeira sequência que chegar nele.
// ============================================================================
import { dataLocal, somarDias, type SessaoAderencia } from "@/lib/aderencia/calcular";
import { contaCarimbo } from "./carimbos";
import { LIMITES_CARDIO, type CardioFeito } from "@/lib/cardio/regras";

export const MARCOS_COMBO = [3, 5, 7, 10, 30] as const;
export type CodigoCombo = "combo_3" | "combo_5" | "combo_7" | "combo_10" | "combo_30";
export const CODIGOS_COMBO: CodigoCombo[] = MARCOS_COMBO.map((n) => `combo_${n}` as CodigoCombo);
export const LIMITES_COMBO = { minutosCardio: 20 } as const;

type SessaoDia = SessaoAderencia & { id: string; conta_aderencia?: boolean | null };
export type DiaCombo = { data: string; /** Instante em que o dia fechou (o que aconteceu por último). */ fechadoEm: string; sessaoId: string };
export type TrofeuCombo = { codigo: CodigoCombo; data: string; sessaoId: string; descricao: string; evidencia: Record<string, unknown> };

const fmtData = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Dias (Brasília) com 20+ min de cardio e o instante em que chegaram aos 20. */
export function diasDeCardioCombo(cardios: CardioFeito[]): Map<string, string> {
  const porDia = new Map<string, CardioFeito[]>();
  for (const f of cardios) {
    if (f.status === "nao_realizado" || f.duracaoMin < LIMITES_CARDIO.minutosMin) continue;
    porDia.set(f.data, [...(porDia.get(f.data) ?? []), f]);
  }
  const out = new Map<string, string>();
  for (const [dia, fs] of porDia) {
    let soma = 0;
    for (const f of [...fs].sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1))) {
      soma += f.duracaoMin;
      if (soma >= LIMITES_COMBO.minutosCardio) { out.set(dia, f.realizadoEm); break; }
    }
  }
  return out;
}

/** Dias com musculação e 20+ min de cardio, em ordem. */
export function diasCombo(sessoes: SessaoDia[], cardios: CardioFeito[]): DiaCombo[] {
  const cardio = diasDeCardioCombo(cardios);
  const musc = new Map<string, SessaoDia>();
  for (const s of sessoes.filter(contaCarimbo).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1))) {
    const d = dataLocal(s.iniciado_em);
    if (!musc.has(d)) musc.set(d, s);
  }
  return [...musc.entries()]
    .filter(([d]) => cardio.has(d))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([data, s]) => {
      const c = cardio.get(data)!;
      return { data, fechadoEm: s.iniciado_em > c ? s.iniciado_em : c, sessaoId: s.id };
    });
}

export function trofeusDoComboSeguido(sessoes: SessaoDia[], cardios: CardioFeito[]): TrofeuCombo[] {
  const out: TrofeuCombo[] = [];
  const dias = diasCombo(sessoes, cardios);
  let inicio = 0;
  for (let i = 0; i < dias.length; i++) {
    if (i > 0 && somarDias(dias[i - 1].data, 1) !== dias[i].data) inicio = i;
    const n = i - inicio + 1;
    const marco = MARCOS_COMBO.find((m) => m === n);
    if (!marco || out.some((t) => t.codigo === `combo_${marco}`)) continue;
    const d = dias[i];
    out.push({
      codigo: `combo_${marco}` as CodigoCombo,
      data: d.fechadoEm,
      sessaoId: d.sessaoId,
      descricao: `${marco} dias seguidos com musculação e cardio, de ${fmtData(dias[inicio].data)} a ${fmtData(d.data)}.`,
      evidencia: { dias: dias.slice(inicio, i + 1).map((x) => x.data) },
    });
  }
  return out;
}

/**
 * Sequência em andamento: dias seguidos até hoje. Se hoje ainda não fechou,
 * a sequência que terminou ontem continua viva.
 */
export function sequenciaComboAtual(dias: Array<Pick<DiaCombo, "data">>, hoje: string): number {
  const set = new Set(dias.map((d) => d.data));
  let dia = set.has(hoje) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (set.has(dia)) { n++; dia = somarDias(dia, -1); }
  return n;
}
