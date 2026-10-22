import { describe, expect, it } from "vitest";
import { PRESCRICOES } from "./index";
import { AQUECIMENTO, foraDaRegra } from "./regras";

describe("padrão de toda ficha: até a falha e aquecimento no 1º exercício", () => {
  for (const p of PRESCRICOES)
    it(p.titulo, () => {
      for (const t of p.plano.treinos) {
        const valem = t.exercicios.filter((e) => !foraDaRegra(e));
        expect(valem.every((e) => e.rir === 0 && /até a falha/.test(e.observacoes ?? ""))).toBe(true);
        expect(valem[0]?.observacoes?.endsWith(AQUECIMENTO)).toBe(true);
        expect(t.exercicios.filter((e) => (e.observacoes ?? "").includes("séries de aquecimento"))).toHaveLength(valem.length ? 1 : 0);
        // a observação de falha não se repete
        for (const e of valem) expect((e.observacoes ?? "").match(/até a falha/g)).toHaveLength(1);
      }
    });

  it("prancha e cardio ficam de fora", () => {
    expect(foraDaRegra({ nome: "Prancha frontal", grupo_muscular: "core", conta_volume: true })).toBe(true);
    expect(foraDaRegra({ nome: "Esteira", grupo_muscular: "cardio", conta_volume: false })).toBe(true);
    expect(foraDaRegra({ nome: "Cadeira extensora", grupo_muscular: "quadriceps", conta_volume: true })).toBe(false);
  });
});
