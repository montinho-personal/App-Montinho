import { describe, expect, it } from "vitest";
import { interpretarExtras, interpretarExtraTrecho } from "./ditado-extra";

const treinos = [{ id: "tA", nome: "A — Peito e tríceps" }, { id: "tB", nome: "B — Costas e bíceps" }];

describe("ditar treino extra", () => {
  it("cardio leve com duração e orientação", () => {
    const x = interpretarExtraTrecho("Cardio leve de 30 minutos na esteira, ritmo de conversa", treinos)!;
    expect(x).toMatchObject({ modalidade: "cardio_leve", titulo: "Esteira leve", duracao_min: 30, grupos: [], series_estimadas: 0, avisos: [] });
    expect(x.descricao).toBe("Cardio leve de 30 minutos na esteira, ritmo de conversa");
  });
  it("corrida/HIIT viram cardio moderado; números por extenso", () => {
    expect(interpretarExtraTrecho("corrida de vinte e cinco minutos", treinos)).toMatchObject({ modalidade: "cardio_moderado", titulo: "Corrida moderada", duracao_min: 25 });
    expect(interpretarExtraTrecho("caminhada de meia hora", treinos)).toMatchObject({ modalidade: "cardio_leve", duracao_min: 30 });
    expect(interpretarExtraTrecho("bike uma hora e meia", treinos)?.duracao_min).toBe(90);
  });
  it("complementar com grupos e séries", () => {
    const x = interpretarExtraTrecho("complementar de glúteo e posterior, 6 séries, 25 minutos", treinos)!;
    expect(x).toMatchObject({ modalidade: "complementar", titulo: "Complementar de glúteo e posterior", grupos: ["gluteo", "posteriores"], series_estimadas: 6, duracao_min: 25, avisos: [] });
  });
  it("resistido usando um treino da ficha", () => {
    const x = interpretarExtraTrecho("repetir o treino B, 50 minutos", treinos)!;
    expect(x).toMatchObject({ modalidade: "resistido", treino_id: "tB", titulo: "Treino Costas e bíceps extra", duracao_min: 50 });
  });
  it("mobilidade e avisos do que faltou", () => {
    expect(interpretarExtraTrecho("alongamento 15 minutos", treinos)).toMatchObject({ modalidade: "mobilidade", titulo: "Alongamento", duracao_min: 15 });
    const semDur = interpretarExtraTrecho("complementar de abdômen", treinos)!;
    expect(semDur.avisos.join(" ")).toMatch(/duração/);
    expect(semDur.avisos.join(" ")).toMatch(/séries/);
    expect(interpretarExtraTrecho("treino F 40 minutos", treinos)!.avisos.join(" ")).toMatch(/treino F/);
  });
  it("vários extras numa fala só", () => {
    const xs = interpretarExtras("mobilidade 20 minutos e outro: complementar de glúteo, 4 séries, 20 minutos; caminhada leve 40 minutos", treinos);
    expect(xs.map((x) => [x.modalidade, x.duracao_min])).toEqual([["mobilidade", 20], ["complementar", 20], ["cardio_leve", 40]]);
  });
});
