import { describe, expect, it } from "vitest";
import { melhorSerie, resumoDaFase, trechosDeFase, type EntradaResumo, type SessaoResumo } from "./resumo-fase";
import type { Semana } from "@/lib/aderencia/calcular";

let k = 0;
const ses = (data: string, exs: SessaoResumo["exercicios"], extra: Partial<SessaoResumo> = {}): SessaoResumo => ({ id: `s${++k}`, iniciado_em: `${data}T10:00:00-03:00`, data, status: "concluida", modo: "normal", series_planejadas: 10, series_concluidas: 10, exercicios: exs, ...extra });
const ex = (nome: string, grupo: string, ...s: Array<[number | null, number]>) => ({ nome, grupo, series: s.map(([c, r]) => ({ tipo: "valida", carga_kg: c, reps: r })) });
const sem = (inicio: string, meta: number, pontos: number, status: Semana["status"] = "cumprida"): Semana => ({ inicio, meta, pontos, concluidas: pontos, parciais: 0, extras: 0, pausada: false, atual: false, status });

const base = (p: Partial<EntradaResumo> = {}): EntradaResumo => ({
  aluno: { nome: "Carol", objetivo: null, nivel: null }, protocolo: { nome: "Missão", fase: "adaptacao" },
  inicio: "2026-10-05", fim: "2026-10-18", geradoEm: "2026-10-19T10:00:00-03:00",
  sessoes: [], semanas: [], ficha: [], medidas: [], fotos: [], checkins: [], ...p,
});

describe("resumo da fase", () => {
  it("melhor série: maior carga, empate → mais reps; aquecimento fora", () => {
    expect(melhorSerie([{ tipo: "aquecimento", carga_kg: 100, reps: 10 }, { tipo: "valida", carga_kg: 80, reps: 8 }, { tipo: "valida", carga_kg: 80, reps: 10 }])).toEqual({ cargaKg: 80, reps: 10 });
    expect(melhorSerie([{ tipo: "valida", carga_kg: null, reps: 15 }])).toEqual({ cargaKg: null, reps: 15 });
    expect(melhorSerie([])).toBeNull();
  });

  it("treinos, previstos, exercícios, séries por semana, corpo e check-ins", () => {
    const r = resumoDaFase(base({
      ficha: ["Leg press 45°", "Supino reto"],
      sessoes: [
        ses("2026-10-06", [ex("Leg press 45°", "quadriceps", [80, 12], [80, 10]), ex("Supino reto", "peito", [30, 10])]),
        ses("2026-10-08", [ex("Leg press 45°", "quadriceps", [90, 10])]),
        ses("2026-10-14", [ex("Leg press 45°", "quadriceps", [100, 10]), ex("Rosca", "biceps", [10, 10])]),
        ses("2026-10-15", [ex("Leg press 45°", "quadriceps", [100, 8])], { status: "abandonada", series_concluidas: 0 }),
        ses("2026-10-01", [ex("Leg press 45°", "quadriceps", [50, 10])]),
      ],
      semanas: [sem("2026-10-05", 3, 2, "parcial"), sem("2026-10-12", 3, 1, "parcial")],
      medidas: [{ data: "2026-10-01", peso_kg: 62.4 }, { data: "2026-10-17", peso_kg: 61.9, cintura_cm: 70 }],
      fotos: ["2026-10-17", "2026-10-17", "2026-09-01"],
      checkins: [{ data: "2026-10-06", origem: "pulso", pulso_energia: "alta" }, { data: "2026-10-07", pulso_pulou: true }],
    }));
    expect(r.formato).toBe("montinho-resumo-fase");
    expect(r.treinosFeitos).toBe(3);
    expect(r.treinosPrevistos).toBe(6);
    expect(r.aderenciaPct).toBe(50);
    expect(r.periodo.semanas).toBe(2);
    expect(r.exercicios).toHaveLength(1); // supino só 1 vez; rosca fora da ficha
    expect(r.exercicios[0]).toMatchObject({ nome: "Leg press 45°", vezes: 3, inicio: { data: "2026-10-06", cargaKg: 80, reps: 12 }, fim: { data: "2026-10-14", cargaKg: 100, reps: 10 }, variacaoKg: 20, variacaoPct: 25 });
    expect(r.seriesPorGrupoSemana).toEqual([
      { semana: "2026-10-05", grupos: { quadriceps: 3, peito: 1 } },
      { semana: "2026-10-12", grupos: { quadriceps: 1, biceps: 1 } },
    ]);
    expect(r.corpo.inicio).toMatchObject({ data: "2026-10-01", pesoKg: 62.4, cinturaCm: null });
    expect(r.corpo.fim).toMatchObject({ data: "2026-10-17", pesoKg: 61.9, cinturaCm: 70 });
    expect(r.fotos).toEqual({ quantidade: 1, datas: ["2026-10-17"] });
    expect(r.checkins).toEqual([{ data: "2026-10-06", energia: "alta", recuperacao: null, motivacao: null, sono: null, dificuldades: null, escala1a10: null }]);
  });

  it("sem dados: nulls e listas vazias", () => {
    const r = resumoDaFase(base());
    expect(r.treinosPrevistos).toBeNull();
    expect(r.aderenciaPct).toBeNull();
    expect(r.corpo).toEqual({ inicio: null, fim: null });
    expect(r.exercicios).toEqual([]);
  });

  it("trechos de fase pelo histórico de versões", () => {
    const t = trechosDeFase([{ data: "2026-10-01", fase: "adaptacao" }, { data: "2026-10-10", fase: "adaptacao" }, { data: "2026-11-12", fase: "intensificacao" }], "2026-11-14");
    expect(t).toEqual([
      { fase: "intensificacao", inicio: "2026-11-12", fim: "2026-11-14", atual: true },
      { fase: "adaptacao", inicio: "2026-10-01", fim: "2026-11-11", atual: false },
    ]);
  });
});
