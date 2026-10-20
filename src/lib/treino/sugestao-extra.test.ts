import { describe, expect, it } from "vitest";
import { sugerirExtraPorVolume, type CandidatoExercicio } from "./sugestao-extra";

const candidatos: CandidatoExercicio[] = [
  { nome: "Cadeira flexora", grupo: "posteriores", doPlano: true, temVideo: true },
  { nome: "Mesa flexora", grupo: "posteriores", doPlano: false, temVideo: true },
  { nome: "Hip thrust com barra", grupo: "gluteo", doPlano: false, temVideo: true },
  { nome: "Elevação lateral com halteres", grupo: "ombro_lateral", doPlano: true, temVideo: true },
];

describe("sugestão automática de treino extra", () => {
  it("escolhe os grupos mais abaixo da meta, prioriza exercício do plano e limita o tamanho", () => {
    const r = sugerirExtraPorVolume({
      metas: { posteriores: { min: 12, max: 16 }, gluteo: { min: 12, max: 16 }, ombro_lateral: { min: 8, max: 12 }, peito: { min: 10, max: 14 } },
      feito7d: { posteriores: 4, gluteo: 9, ombro_lateral: 7, peito: 12 },
      recentes48h: [],
      seriesExtrasDisponiveis: 12,
      candidatos,
    });
    expect(r.sugestao?.grupos.map((g) => g.grupo)).toEqual(["posteriores", "gluteo"]);
    expect(r.sugestao?.grupos.map((g) => g.series)).toEqual([4, 3]);
    expect(r.sugestao?.exercicios[0].nome).toBe("Cadeira flexora");
    expect(r.sugestao?.seriesTotal).toBe(7);
    expect(r.sugestao?.duracaoMin).toBe(25);
    expect(r.sugestao?.descricao).toContain("Motivo:");
  });
  it("respeita 48 h de recuperação e prioridades do plano", () => {
    const r = sugerirExtraPorVolume({
      metas: { posteriores: { min: 12, max: 16 }, gluteo: { min: 12, max: 16 }, ombro_lateral: { min: 8, max: 12 } },
      feito7d: { posteriores: 2, gluteo: 8, ombro_lateral: 4 },
      recentes48h: ["posteriores"],
      seriesExtrasDisponiveis: 12,
      candidatos,
      prioridades: ["ombro_lateral"],
    });
    expect(r.sugestao?.grupos.map((g) => g.grupo)).toEqual(["ombro_lateral", "gluteo"]);
  });
  it("não sugere sem metas, sem falta real ou sem séries extras disponíveis", () => {
    expect(sugerirExtraPorVolume({ metas: {}, feito7d: {}, recentes48h: [], seriesExtrasDisponiveis: 12, candidatos }).sugestao).toBeNull();
    expect(sugerirExtraPorVolume({ metas: { gluteo: { min: 10, max: 12 } }, feito7d: { gluteo: 9 }, recentes48h: [], seriesExtrasDisponiveis: 12, candidatos }).sugestao).toBeNull();
    const r = sugerirExtraPorVolume({ metas: { gluteo: { min: 10, max: 12 } }, feito7d: { gluteo: 2 }, recentes48h: [], seriesExtrasDisponiveis: 1, candidatos });
    expect(r.sugestao).toBeNull();
    expect(r.motivo).toContain("limite");
  });
});
