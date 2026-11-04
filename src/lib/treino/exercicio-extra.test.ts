import { describe, expect, it } from "vitest";
import { ehExercicioExtra, exercicioDoExtra, extrasQueCabem, MAX_EXERCICIOS_EXTRAS, prescricaoExtra } from "./exercicio-extra";

describe("exercício extra", () => {
  it("marca, padrão 3 × 10–12 e limite por treino", () => {
    const p = prescricaoExtra({ video: null, instrucoes: ["a", "b", "c", "d"], equipamento: ["halteres"] });
    expect(p).toMatchObject({ extra_aluno: true, series: 3, reps: "10-12", descanso_seg: 90, instrucoes: ["a", "b", "c"] });
    const se = { id: "se1", prescricao: p, nome: "Elevação lateral", grupo_muscular: "deltoide_lateral", biblioteca_id: "b1" };
    expect(ehExercicioExtra(se)).toBe(true);
    expect(ehExercicioExtra({ id: "x", prescricao: { series: 3 } })).toBe(false);
    const v = exercicioDoExtra(se, "t1");
    expect(v).toMatchObject({ id: "se1", treino_id: "t1", nome: "Elevação lateral", series: 3, reps: "10-12", tecnica: "normal", conta_volume: true, equipamento: ["halteres"] });
    expect(extrasQueCabem([se, { id: "y", prescricao: {} }])).toBe(MAX_EXERCICIOS_EXTRAS - 1);
    expect(extrasQueCabem(Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, prescricao: p })))).toBe(0);
  });
});
