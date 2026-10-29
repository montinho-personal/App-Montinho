import { describe, expect, it } from "vitest";
import { fatoresDeDesempate, textoDaCutucada, trofeusDoPerfil } from "./perfil";

const p = { trofeus: [{ codigo: "primeiro_treino", em: "2026-10-01T10:00:00Z" }, { codigo: "recorde", em: "2026-10-20T10:00:00Z" }, { codigo: "cardio_1", em: "2026-10-10T10:00:00Z" }], desempate: { pct_semana: 75, carimbos: 12, semanas_seguidas: 2, pct_4sem: null } };

describe("perfil do ranking", () => {
  it("troféus mais recentes primeiro, com nome e marcando o que não conta no ranking", () => {
    const t = trofeusDoPerfil(p);
    expect(t.map((x) => x.codigo)).toEqual(["recorde", "cardio_1", "primeiro_treino"]);
    expect(t[0].contaNoRanking).toBe(false);
    expect(t[2].nome).toBe("Primeiro passo");
  });
  it("fatores na ordem do desempate; troféus contam só os do ranking", () => {
    const f = fatoresDeDesempate(p);
    expect(f.map((x) => x.rotulo)).toEqual(["Troféus", "Meta da semana passada", "Carimbos", "Semanas seguidas", "Meta nas últimas 4 semanas"]);
    expect(f.map((x) => x.valor)).toEqual(["2 🏆", "75%", "12", "2", "—"]);
  });
  it("recado da cutucada", () => {
    expect(textoDaCutucada("😈")).toBe("Vou te passar no ranking!");
  });
});
