import { describe, expect, it } from "vitest";
import { metasDaFicha, resumoDaSemana, avisoDaSerie, linhaDoGrupo, somarNoPlacar, diasRestantes, placarDaSemana, prioridadeDoGrupo, statusDaMeta, sugestaoDeAgora } from "./livre-metas";

const metas = { peito: { min: 10, max: 14 }, costas: { min: 12, max: 16 }, quadriceps: { min: 10, max: 14 }, posteriores: { min: 8, max: 12 } };

describe("treino livre por metas", () => {
  it("status pela faixa: zerado, abaixo, na faixa, limite, passou", () => {
    const m = { min: 10, max: 14 };
    expect([0, 6, 12, 14, 15].map((n) => statusDaMeta(n, m))).toEqual(["zerado", "abaixo", "na_faixa", "limite", "acima"]);
  });
  it("placar na ordem dos músculos, com quanto falta", () => {
    const p = placarDaSemana(metas, { peito: 11, costas: 4 });
    expect(p.map((l) => l.grupo)).toEqual(["peito", "costas", "quadriceps", "posteriores"]);
    expect(p.find((l) => l.grupo === "costas")).toMatchObject({ status: "abaixo", faltam: 8 });
  });
  it("sugere o que mais falta e deixa para depois quem treinou nas últimas 48 h", () => {
    const p = placarDaSemana(metas, { peito: 11, costas: 4 });
    const s = sugestaoDeAgora(p, { hoje: "2026-10-28", recentes: ["quadriceps"] })!;
    expect(s.grupos[0]).toBe("posteriores");
    expect(s.grupos).not.toContain("peito");
    expect(s.grupos).not.toContain("quadriceps");
    expect(s.texto).toMatch(/Peitoral já está na faixa/);
  });
  it("tudo na faixa: parabeniza e não empurra mais", () => {
    const p = placarDaSemana(metas, { peito: 12, costas: 13, quadriceps: 11, posteriores: 9 });
    expect(sugestaoDeAgora(p, { hoje: "2026-10-28" })!.texto).toMatch(/na faixa/);
  });
  it("fim de semana chegando: avisa", () => {
    expect(diasRestantes("2026-10-26")).toBe(7); // segunda
    expect(diasRestantes("2026-11-01")).toBe(1); // domingo
    const s = sugestaoDeAgora(placarDaSemana(metas, {}), { hoje: "2026-10-31" })!;
    expect(s.texto).toMatch(/termina amanhã/);
  });
  it("ordem do escolher exercício e avisos da série", () => {
    const p = placarDaSemana(metas, { peito: 14, costas: 0, quadriceps: 5 });
    expect(prioridadeDoGrupo(p, "costas")).toBeLessThan(prioridadeDoGrupo(p, "quadriceps"));
    expect(prioridadeDoGrupo(p, "quadriceps")).toBeLessThan(prioridadeDoGrupo(p, "peito"));
    expect(avisoDaSerie(9, 10, { nome: "Peito", min: 10, max: 14 })).toMatch(/entrou na faixa/);
    expect(avisoDaSerie(13, 14, { nome: "Peito", min: 10, max: 14 })).toMatch(/chegou no limite/);
    expect(avisoDaSerie(14, 15, { nome: "Peito", min: 10, max: 14 })).toMatch(/passou do limite/);
    expect(avisoDaSerie(11, 12, { nome: "Peito", min: 10, max: 14 })).toBeNull();
  });
  it("ombro lateral conta em Ombros e o placar soma na hora", () => {
    const p = placarDaSemana({ ombros: { min: 8, max: 12 } }, { ombros: 7 });
    expect(linhaDoGrupo(p, "ombro_lateral")?.grupo).toBe("ombros");
    const depois = somarNoPlacar(p, "ombro_lateral", 1);
    expect(depois[0]).toMatchObject({ feitas: 8, status: "na_faixa", faltam: 0 });
    expect(somarNoPlacar(p, "biceps", 1)).toBe(p);
  });
  it("meta tirada da ficha e o resumo da semana", () => {
    expect(metasDaFicha([{ grupo: "peito", total: 12 }, { grupo: "biceps", total: 0.4 }, { grupo: "costas", total: 2 }])).toEqual({ peito: { min: 12, max: 15 }, costas: { min: 2, max: 3 } });
    const p = placarDaSemana(metas, { peito: 8, costas: 6 });
    expect(resumoDaSemana(p)).toBe("Nesta semana você já fez Peitoral (8 séries) e Costas (6).");
    expect(resumoDaSemana(placarDaSemana(metas, {}))).toMatch(/ainda não treinou/);
  });
});
