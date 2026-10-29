import { describe, expect, it } from "vitest";
import { filtrarParaCelebrar, mensagemWhatsConquista, ordenarParaCelebrar, resumoCelebrar, type ConquistaCelebrar } from "./celebrar";

const c = (id: string, p: Partial<ConquistaCelebrar> = {}): ConquistaCelebrar => ({ id, alunoId: "a1", codigo: "x", categoria: "constancia", titulo: "T", data: "2026-10-01T10:00:00Z", reconhecida: false, ...p });

describe("celebrar conquistas", () => {
  it("põe as que faltam celebrar primeiro, mais recentes antes", () => {
    const lista = [c("1", { reconhecida: true, data: "2026-10-05T00:00:00Z" }), c("2", { data: "2026-10-01T00:00:00Z" }), c("3", { data: "2026-10-03T00:00:00Z" })];
    expect(ordenarParaCelebrar(lista).map((x) => x.id)).toEqual(["3", "2", "1"]);
  });

  it("filtra por tipo, aluno e situação", () => {
    const lista = [c("1", { codigo: "recorde", categoria: "desempenho" }), c("2", { alunoId: "a2" }), c("3", { reconhecida: true })];
    expect(filtrarParaCelebrar(lista, { tipo: "recordes" }).map((x) => x.id)).toEqual(["1"]);
    expect(filtrarParaCelebrar(lista, { alunoId: "a2" }).map((x) => x.id)).toEqual(["2"]);
    expect(filtrarParaCelebrar(lista, { situacao: "falta" }).map((x) => x.id)).toEqual(["1", "2"]);
    expect(filtrarParaCelebrar(lista, { situacao: "celebradas" }).map((x) => x.id)).toEqual(["3"]);
  });

  it("conta conquistas, alunos e o que falta", () => {
    expect(resumoCelebrar([c("1"), c("2", { alunoId: "a2", reconhecida: true }), c("3")])).toEqual({ total: 3, alunos: 2, celebradas: 1, falta: 2 });
  });

  it("mensagem do WhatsApp usa o primeiro nome e o troféu", () => {
    const m = mensagemWhatsConquista("Ana Paula Souza", "Semana Espartana");
    expect(m).toContain("Fala, Ana!");
    expect(m).toContain("“Semana Espartana”");
    expect(m).not.toMatch(/\b(ele|ela|dele|dela)\b/i);
    expect(mensagemWhatsConquista("Rui", "Recorde no supino", "recorde")).toContain("recorde pessoal (Recorde no supino)");
  });
});
