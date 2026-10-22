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

describe("exerciciosForaDoPadrao", () => {
  it("conta só o que muda; depois de aplicar, zero", async () => {
    const { comRegras, exerciciosForaDoPadrao } = await import("./regras");
    const e = (nome: string, rir: number | null, obs: string | null = null) => ({ nome, series: 3, reps: "12", ie: null, rir, descanso_seg: 60, observacoes: obs, grupo_muscular: null, grupos_secundarios: [] }) as never;
    const t = { letra: "A", nome: "A", ativo: true, observacoes: null, exercicios: [e("Prancha frontal", 3), e("Supino reto", 3), e("Crucifixo", 2, "Devagar.")] } as never;
    expect(exerciciosForaDoPadrao([t])).toBe(2);
    expect(exerciciosForaDoPadrao([comRegras(t)])).toBe(0);
    expect(exerciciosForaDoPadrao([{ ...(t as object), ativo: false } as never])).toBe(0);
  });
});
