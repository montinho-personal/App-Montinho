// ============================================================================
// Cardios do Strava (corrida, bike, caminhada, natação…) — regras PURAS.
// Só entram atividades de cardio; musculação/treino de força do relógio não
// (o treino de musculação já é registrado no app). Não contam na meta semanal
// de musculação: aparecem à parte, em Evolução e na ficha do aluno.
// ============================================================================

import type { AtividadeStrava } from "./combinar";

/** sport_type do Strava → nome em português + emoji. */
export const TIPOS_CARDIO: Record<string, { nome: string; emoji: string }> = {
  Run: { nome: "Corrida", emoji: "🏃" },
  TrailRun: { nome: "Corrida em trilha", emoji: "🏃" },
  VirtualRun: { nome: "Corrida na esteira", emoji: "🏃" },
  Walk: { nome: "Caminhada", emoji: "🚶" },
  Hike: { nome: "Trilha", emoji: "🥾" },
  Ride: { nome: "Bike", emoji: "🚴" },
  MountainBikeRide: { nome: "Mountain bike", emoji: "🚵" },
  GravelRide: { nome: "Bike (gravel)", emoji: "🚴" },
  EBikeRide: { nome: "Bike elétrica", emoji: "🚴" },
  EMountainBikeRide: { nome: "Mountain bike elétrica", emoji: "🚵" },
  VirtualRide: { nome: "Bike ergométrica", emoji: "🚴" },
  Swim: { nome: "Natação", emoji: "🏊" },
  Rowing: { nome: "Remo", emoji: "🚣" },
  VirtualRow: { nome: "Remo ergômetro", emoji: "🚣" },
  Elliptical: { nome: "Elíptico", emoji: "🏃" },
  StairStepper: { nome: "Escada", emoji: "🪜" },
  HighIntensityIntervalTraining: { nome: "HIIT", emoji: "🔥" },
  Crossfit: { nome: "Crossfit", emoji: "🔥" },
  Soccer: { nome: "Futebol", emoji: "⚽" },
  Tennis: { nome: "Tênis", emoji: "🎾" },
  Badminton: { nome: "Badminton", emoji: "🏸" },
  Pickleball: { nome: "Pickleball", emoji: "🏓" },
  Padel: { nome: "Padel", emoji: "🎾" },
  Squash: { nome: "Squash", emoji: "🎾" },
  TableTennis: { nome: "Tênis de mesa", emoji: "🏓" },
  InlineSkate: { nome: "Patins", emoji: "🛼" },
  Skateboard: { nome: "Skate", emoji: "🛹" },
  Kayaking: { nome: "Caiaque", emoji: "🛶" },
  StandUpPaddling: { nome: "Stand up paddle", emoji: "🏄" },
  Surfing: { nome: "Surfe", emoji: "🏄" },
  Dance: { nome: "Dança", emoji: "💃" },
};

export const ehCardio = (sportType: string | null | undefined) => !!sportType && sportType in TIPOS_CARDIO;
export const tipoCardio = (sportType: string | null | undefined) => TIPOS_CARDIO[sportType ?? ""] ?? { nome: "Cardio", emoji: "❤️" };

export type CardioStrava = {
  aluno_id: string;
  atividade_id: number;
  tipo: string;
  nome: string | null;
  inicio: string;
  duracao_seg: number;
  distancia_m: number | null;
  fc_media: number | null;
  fc_max: number | null;
  elevacao_m: number | null;
};

/** Atividades do Strava → cardios (sem as que já são o batimento de um treino do app). */
export function cardiosDasAtividades(alunoId: string, atividades: Array<AtividadeStrava & { distance?: number | null; total_elevation_gain?: number | null }>, jaNoTreino: Set<number>): CardioStrava[] {
  return atividades
    .filter((a) => ehCardio(a.sport_type) && !jaNoTreino.has(a.id) && a.elapsed_time > 0)
    .map((a) => ({
      aluno_id: alunoId,
      atividade_id: a.id,
      tipo: a.sport_type!,
      nome: a.name?.slice(0, 120) ?? null,
      inicio: a.start_date,
      duracao_seg: a.moving_time && a.moving_time > 0 ? a.moving_time : a.elapsed_time,
      distancia_m: a.distance && a.distance > 0 ? Math.round(a.distance) : null,
      fc_media: a.average_heartrate ?? null,
      fc_max: a.max_heartrate ?? null,
      elevacao_m: a.total_elevation_gain && a.total_elevation_gain > 0 ? Math.round(a.total_elevation_gain) : null,
    }));
}

const minutos = (s: number) => {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
};
const km = (m: number) => `${(m / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;

/** “Corrida · 5,2 km · 31 min · ❤️ 152 bpm”. */
export function textoCardioStrava(c: Pick<CardioStrava, "tipo" | "duracao_seg" | "distancia_m" | "fc_media">): string {
  const t = tipoCardio(c.tipo);
  return [t.nome, c.distancia_m ? km(c.distancia_m) : null, minutos(c.duracao_seg), c.fc_media ? `❤️ ${Math.round(c.fc_media)} bpm` : null].filter(Boolean).join(" · ");
}

/** Semana atual (segunda a domingo, horário de Brasília): quantos cardios, minutos e km. */
export function resumoSemanaCardio(cardios: Array<Pick<CardioStrava, "inicio" | "duracao_seg" | "distancia_m">>, hoje: string): { atividades: number; minutos: number; km: number } {
  const d = new Date(`${hoje}T12:00:00Z`);
  const seg = new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
  const local = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
  const daSemana = cardios.filter((c) => local(c.inicio) >= seg && local(c.inicio) <= hoje);
  return {
    atividades: daSemana.length,
    minutos: Math.round(daSemana.reduce((a, c) => a + c.duracao_seg, 0) / 60),
    km: Math.round(daSemana.reduce((a, c) => a + (c.distancia_m ?? 0), 0) / 100) / 10,
  };
}
