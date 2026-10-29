// ============================================================================
// Cardio na madrugada, 10 km no dia e 1 hora de escada (pedido do Montinho,
// 29/10/2026) — regras PURAS.
//
// HORÁRIO: só vale o cardio COMEÇADO NO APP — “▶ Começar” no cronômetro do
// Montinho Cardio (ou o treino extra de cardio). A hora é a do SERVIDOR no
// toque em Começar (horário de Brasília, segundos ignorados): 1 minuto depois
// do limite já não vale. Cardio só anotado depois, ou vindo do Strava, não conta.
//   • Madrugador do Cardio (cardio_madrugada): começar entre 3h00 e 4h59;
//   • Cardio das 4h (cardio_4h): começar entre 3h00 e 4h00 (4h01 não vale);
//   • Cardio da Meia-Noite (cardio_meia_noite): começar entre 0h00 e 2h59.
// O cardio precisa valer: 10 minutos ou mais, feito (não “não realizado”).
//
// 10 km no Dia (cardio_10km): somar 10 km ou mais no mesmo dia em esteira,
// caminhada, corrida ou HIIT (distância anotada ou do relógio).
// 1 Hora de Escada (cardio_escada_1h): somar 60 minutos ou mais de escada no
// mesmo dia (partes de 10+ minutos).
// Cada um vale uma vez.
// ============================================================================
import { LIMITES_CARDIO, type CardioFeito } from "@/lib/cardio/regras";
import { minutosBrasilia, horaBrasilia } from "./regras";

export const JANELAS_CARDIO = {
  cardio_meia_noite: { de: 0, ate: 2 * 60 + 59, texto: "entre 0h00 e 2h59" },
  cardio_madrugada: { de: 3 * 60, ate: 4 * 60 + 59, texto: "entre 3h00 e 4h59" },
  cardio_4h: { de: 3 * 60, ate: 4 * 60, texto: "entre 3h00 e 4h00" },
} as const;
export const LIMITES_CARDIO_DIA = { km: 10, escadaMin: 60, modalidadesKm: ["esteira", "caminhada", "corrida", "hiit"] as string[] } as const;

export type CodigoCardioHorario = keyof typeof JANELAS_CARDIO | "cardio_10km" | "cardio_escada_1h";
export const CODIGOS_CARDIO_HORARIO: CodigoCardioHorario[] = ["cardio_madrugada", "cardio_4h", "cardio_meia_noite", "cardio_10km", "cardio_escada_1h"];
export type TrofeuCardioHorario = { codigo: CodigoCardioHorario; data: string; descricao: string; evidencia: Record<string, unknown> };

const vale = (f: CardioFeito) => f.status !== "nao_realizado" && f.duracaoMin >= LIMITES_CARDIO.minutosMin;
const fmtKm = (n: number) => `${String(Math.round(n * 10) / 10).replace(".", ",")} km`;

/** Em qual janela de horário o cardio foi começado no app (null = nenhuma ou não começou no app). */
export function janelasDoInicio(f: CardioFeito): Array<keyof typeof JANELAS_CARDIO> {
  if (!f.iniciadoNoApp || !vale(f) || f.origem === "strava") return [];
  const m = minutosBrasilia(f.iniciadoNoApp);
  return (Object.keys(JANELAS_CARDIO) as Array<keyof typeof JANELAS_CARDIO>).filter((k) => m >= JANELAS_CARDIO[k].de && m <= JANELAS_CARDIO[k].ate);
}

export function trofeusCardioHorario(feitos: CardioFeito[]): TrofeuCardioHorario[] {
  const out: TrofeuCardioHorario[] = [];
  const ordem = [...feitos].sort((a, b) => (a.realizadoEm < b.realizadoEm ? -1 : 1));
  const ja = new Set<string>();
  for (const f of ordem) {
    for (const k of janelasDoInicio(f)) {
      if (ja.has(k)) continue;
      ja.add(k);
      const hora = horaBrasilia(f.iniciadoNoApp!);
      out.push({ codigo: k, data: f.realizadoEm, descricao: `Cardio começado no app às ${hora} (${f.duracaoMin} min).`, evidencia: { inicio: f.iniciadoNoApp, hora, cardio: f.id } });
    }
  }
  // Somas do dia.
  const km = new Map<string, number>();
  const escada = new Map<string, number>();
  for (const f of ordem) {
    if (f.status === "nao_realizado") continue;
    if (!ja.has("cardio_10km") && LIMITES_CARDIO_DIA.modalidadesKm.includes(f.modalidade) && (f.distanciaKm ?? 0) > 0) {
      const soma = (km.get(f.data) ?? 0) + (f.distanciaKm ?? 0);
      km.set(f.data, soma);
      if (soma >= LIMITES_CARDIO_DIA.km) {
        ja.add("cardio_10km");
        out.push({ codigo: "cardio_10km", data: f.realizadoEm, descricao: `${fmtKm(soma)} de cardio no mesmo dia.`, evidencia: { dia: f.data, km: soma } });
      }
    }
    if (!ja.has("cardio_escada_1h") && f.modalidade === "escada" && f.duracaoMin >= LIMITES_CARDIO.minutosMin) {
      const soma = (escada.get(f.data) ?? 0) + f.duracaoMin;
      escada.set(f.data, soma);
      if (soma >= LIMITES_CARDIO_DIA.escadaMin) {
        ja.add("cardio_escada_1h");
        out.push({ codigo: "cardio_escada_1h", data: f.realizadoEm, descricao: `${soma} minutos de escada no mesmo dia.`, evidencia: { dia: f.data, minutos: soma } });
      }
    }
  }
  return out;
}
