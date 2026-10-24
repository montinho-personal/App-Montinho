import { describe, expect, it } from "vitest";
import { cardiosDasAtividades, ehCardio, resumoSemanaCardio, textoCardioStrava } from "./cardio";

describe("cardios do Strava", () => {
  const ativ = [
    { id: 1, name: "Corrida da manhã", start_date: "2026-10-20T09:00:00Z", elapsed_time: 2000, moving_time: 1860, sport_type: "Run", distance: 5230, average_heartrate: 151.6 },
    { id: 2, name: "Musculação", start_date: "2026-10-20T20:00:00Z", elapsed_time: 3600, sport_type: "WeightTraining" },
    { id: 3, name: "Pedal", start_date: "2026-10-22T10:00:00Z", elapsed_time: 3600, sport_type: "Ride", distance: 25000 },
    { id: 4, name: "Treino do app", start_date: "2026-10-23T10:00:00Z", elapsed_time: 3600, sport_type: "Run" },
  ];
  it("só cardio, sem musculação e sem a atividade que já é o batimento de um treino do app", () => {
    const c = cardiosDasAtividades("al", ativ, new Set([4]));
    expect(c.map((x) => x.atividade_id)).toEqual([1, 3]);
    expect(c[0]).toMatchObject({ tipo: "Run", duracao_seg: 1860, distancia_m: 5230, fc_media: 151.6 });
    expect(ehCardio("WeightTraining")).toBe(false);
  });
  it("texto no padrão do Brasil", () => {
    expect(textoCardioStrava({ tipo: "Run", duracao_seg: 1860, distancia_m: 5230, fc_media: 151.6 })).toBe("Corrida · 5,2 km · 31 min · ❤️ 152 bpm");
    expect(textoCardioStrava({ tipo: "Ride", duracao_seg: 4500, distancia_m: null, fc_media: null })).toBe("Bike · 1 h 15 min");
  });
  it("resumo da semana (segunda a domingo)", () => {
    const c = cardiosDasAtividades("al", ativ, new Set());
    expect(resumoSemanaCardio(c, "2026-10-24")).toEqual({ atividades: 3, minutos: 151, km: 30.2 });
    expect(resumoSemanaCardio(c, "2026-10-27").atividades).toBe(0);
  });
});
