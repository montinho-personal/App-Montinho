import { describe, expect, it } from "vitest";
import { mensagemRelatorioEvolucao, tomDoRelatorio } from "./mensagem-relatorio";

const base = { semDados: false, marcos: [], exerciciosComparaveis: 4, exerciciosQueSubiram: 1, treinos: 12, tonelagem: 25300, destaques: [], semanas: 4 };
const destaque = { nome: "Supino reto", inicial: { data: "2026-10-01", carga: 40 }, atual: { data: "2026-11-01", carga: 50 } };

describe("mensagem do relatório de evolução", () => {
  it("escolhe o tom pelos números", () => {
    expect(tomDoRelatorio({ ...base, semDados: true })).toBe("inicio");
    expect(tomDoRelatorio({ ...base, marcos: [{ data: "", exercicio: "", carga: 1, anterior: 0 }] })).toBe("marcas");
    expect(tomDoRelatorio({ ...base, exerciciosQueSubiram: 2 })).toBe("subiu");
    expect(tomDoRelatorio(base)).toBe("estavel");
  });
  it("marcas: prévia do destaque, constância e link", () => {
    const m = mensagemRelatorioEvolucao({ primeiroNome: "Ana", r: { ...base, marcos: [{ data: "", exercicio: "", carga: 1, anterior: 0 }, { data: "", exercicio: "", carga: 1, anterior: 0 }], destaques: [destaque] as never }, aderenciaPct: 92, url: "https://x/relatorio/1" });
    expect(m).toContain("2 marcas pessoais novas");
    expect(m).toContain("de 40 kg para 50 kg");
    expect(m).toContain("92% de constância");
    expect(m).toContain("https://x/relatorio/1");
  });
  it("estável fala de constância, sem dizer que piorou", () => {
    const m = mensagemRelatorioEvolucao({ primeiroNome: "Ana", r: base, aderenciaPct: 50, url: "u" });
    expect(m).toContain("25,3 toneladas");
    expect(m).toContain("próximo salto");
    expect(m).not.toContain("constância no período");
  });
});
