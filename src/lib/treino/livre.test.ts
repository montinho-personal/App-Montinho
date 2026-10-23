import { describe, expect, it } from "vitest";
import { ehSessaoLivre, hrefDaSessao, lerCarga, lerReps, resumoLivre, snapshotLivre, textoUltimaVez, tiposDeSerie, treinoDoLivre, type ExercicioLivre } from "./livre";

const EXS: ExercicioLivre[] = [
  { nome: "Supino reto com barra", biblioteca_id: "b1", tecnica: "dropset", series: [{ tipo: "aquecimento", carga_kg: 20, reps: 15 }, { tipo: "valida", carga_kg: 40, reps: 10 }, { tipo: "valida", carga_kg: 40, reps: 8 }, { tipo: "dropset", carga_kg: 30, reps: 6 }] },
  { nome: "Aquele de puxar", biblioteca_id: null, tecnica: "normal", series: [{ tipo: "valida", carga_kg: null, reps: 12 }] },
  { nome: "Escolhido e não feito", biblioteca_id: "b3", tecnica: "normal", series: [] },
];

describe("treino livre", () => {
  it("marca a sessão e leva para a tela certa", () => {
    expect(ehSessaoLivre({ snapshot: snapshotLivre() })).toBe(true);
    expect(ehSessaoLivre({ snapshot: { treino: {} } })).toBe(false);
    expect(hrefDaSessao({ id: "s1", treino_id: null, snapshot: snapshotLivre() })).toBe("/aluno/livre/s1");
    expect(hrefDaSessao({ id: "s2", treino_id: "t1", snapshot: {} })).toBe("/aluno/treino/t1?sessao=s2");
  });
  it("tipos de série: normal, aquecimento e o da técnica quando existe", () => {
    expect(tiposDeSerie("dropset").map((t) => t.id)).toEqual(["valida", "aquecimento", "dropset"]);
    expect(tiposDeSerie("biset").map((t) => t.id)).toEqual(["valida", "aquecimento"]);
  });
  it("resumo: aquecimento fora; volume, maior carga e técnicas", () => {
    expect(resumoLivre(EXS)).toEqual({ exercicios: 2, series: 4, volumeKg: 40 * 10 + 40 * 8 + 30 * 6, tecnicas: ["Drop-set"], maiorCarga: { nome: "Supino reto com barra", carga: 40 } });
  });
  it("vira treino de Meus treinos com séries de trabalho, faixa de reps e maior carga", () => {
    expect(treinoDoLivre(EXS)).toEqual([
      { biblioteca_id: "b1", nome_livre: null, series: 3, reps: "6-10", descanso_seg: 90, carga_kg: 40 },
      { biblioteca_id: null, nome_livre: "Aquele de puxar", series: 1, reps: "12", descanso_seg: 90, carga_kg: null },
    ]);
  });
  it("lê carga com vírgula e repetições inteiras", () => {
    expect([lerCarga("42,5"), lerCarga(" 40 kg"), lerCarga(""), lerCarga("abc")]).toEqual([42.5, 40, null, null]);
    expect([lerReps("10"), lerReps(""), lerReps("1.5")]).toEqual([10, null, null]);
  });
  it("texto da última vez", () => {
    expect(textoUltimaVez({ data: "2026-10-21T10:00:00Z", series: [{ tipo: "aquecimento", carga_kg: 10, reps: 15 }, { tipo: "valida", carga_kg: 42.5, reps: 10 }, { tipo: "valida", carga_kg: null, reps: 12 }] })).toBe("Última vez (21/10): 42,5 kg × 10 · 12 reps");
    expect(textoUltimaVez(null)).toBeNull();
  });
});
