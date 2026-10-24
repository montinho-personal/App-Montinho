import { describe, expect, it } from "vitest";
import { mensagemCriar } from "./criar-treino";

describe("Criar com IA — o contexto do aluno vai junto com o pedido", () => {
  it("leva restrições, prioridades, foco e os outros treinos", () => {
    const m = mensagemCriar("glúteo com ênfase em hip thrust, 6 exercícios", { letra: "A", objetivo: "Hipertrofia", nivel: "Intermediário", sexo: "feminino", idade: 31, restricoes: ["Lesões: condromalácia no joelho direito"], prioridades: ["gluteo", "posteriores"], focoDoDia: "Glúteo", duracaoMin: 60, outrosTreinos: [{ letra: "B", exercicios: ["Supino inclinado com halteres"] }] });
    expect(m).toContain("Treino a montar: A (foco: Glúteo)");
    expect(m).toContain("condromalácia");
    expect(m).toContain("Prioridades musculares: gluteo, posteriores");
    expect(m).toContain("- B: Supino inclinado com halteres");
    expect(m).toContain("60 min");
  });
  it("sem restrição informada, deixa claro", () => {
    expect(mensagemCriar("x", { letra: "C", objetivo: null, nivel: null, sexo: null, idade: null, restricoes: [], prioridades: [], focoDoDia: null, duracaoMin: null, outrosTreinos: [] })).toContain("Restrições: nenhuma informada");
  });
});
