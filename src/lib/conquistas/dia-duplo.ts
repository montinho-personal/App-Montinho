// ============================================================================
// Troféus do “dia em dobro” (pedido do Montinho, 28/10/2026):
//  • Dois Fôlegos  — 2 cardios no mesmo dia, cada um com 10 min ou mais;
//  • Combo Completo — musculação e cardio no mesmo dia;
//  • Dose Dupla    — 2 treinos de musculação no mesmo dia.
// Cada um vale uma vez. Dia = horário de Brasília. Musculação conta como no
// carimbo (concluída, ou extra/livre com séries; nada importado). Cardio vem
// já juntado (registros + extras de cardio + Strava, sem contar duas vezes).
// ============================================================================
import { dataLocal } from "@/lib/aderencia/calcular";
import { contaCarimbo } from "./carimbos";
import { diasDeCardio, LIMITES_CARDIO, type CardioFeito } from "@/lib/cardio/regras";
import type { SessaoAderencia } from "@/lib/aderencia/calcular";

export type CodigoDiaDuplo = "dois_folegos" | "combo_completo" | "dose_dupla";
export const CODIGOS_DIA_DUPLO: CodigoDiaDuplo[] = ["dois_folegos", "combo_completo", "dose_dupla"];

type SessaoDia = SessaoAderencia & { id: string; conta_aderencia?: boolean | null };
export type TrofeuDiaDuplo = { codigo: CodigoDiaDuplo; data: string; sessaoId: string | null; descricao: string; evidencia: Record<string, unknown> };

const fmtData = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function trofeusDoDiaDuplo(sessoes: SessaoDia[], cardios: CardioFeito[]): TrofeuDiaDuplo[] {
  const out: TrofeuDiaDuplo[] = [];
  const musc = sessoes.filter(contaCarimbo).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  const muscPorDia = new Map<string, SessaoDia[]>();
  for (const s of musc) {
    const d = dataLocal(s.iniciado_em);
    muscPorDia.set(d, [...(muscPorDia.get(d) ?? []), s]);
  }

  // Dose Dupla: o 2º treino de musculação do dia.
  const dupla = [...muscPorDia.entries()].find(([, l]) => l.length >= 2);
  if (dupla) {
    const [dia, l] = dupla;
    out.push({ codigo: "dose_dupla", data: l[1].iniciado_em, sessaoId: l[1].id, descricao: `2 treinos de musculação em ${fmtData(dia)}.`, evidencia: { dia, sessoes: [l[0].id, l[1].id] } });
  }

  // Dois Fôlegos: 2 cardios de 10+ min no mesmo dia (pedacinhos menores não contam aqui).
  const cardiosOk = cardios.filter((f) => f.status !== "nao_realizado" && f.duracaoMin >= LIMITES_CARDIO.minutosMin).sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1));
  const cardioPorDia = new Map<string, CardioFeito[]>();
  for (const f of cardiosOk) cardioPorDia.set(f.data, [...(cardioPorDia.get(f.data) ?? []), f]);
  const dois = [...cardioPorDia.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).find(([, l]) => l.length >= 2);
  if (dois) {
    const [dia, l] = dois;
    out.push({ codigo: "dois_folegos", data: l[1].realizadoEm, sessaoId: null, descricao: `2 cardios em ${fmtData(dia)}: ${l[0].duracaoMin} + ${l[1].duracaoMin} min.`, evidencia: { dia, registros: [l[0].id, l[1].id] } });
  }

  // Combo Completo: dia com musculação e cardio válido (o que acontecer por último fecha o combo).
  const combo = diasDeCardio(cardios).find((d) => d.valido && muscPorDia.has(d.data));
  if (combo) {
    const s = muscPorDia.get(combo.data)![0];
    const data = s.iniciado_em > combo.validoEm! ? s.iniciado_em : combo.validoEm!;
    out.push({ codigo: "combo_completo", data, sessaoId: s.id, descricao: `Musculação e ${combo.minutos} min de cardio em ${fmtData(combo.data)}.`, evidencia: { dia: combo.data, sessao: s.id } });
  }
  return out;
}
