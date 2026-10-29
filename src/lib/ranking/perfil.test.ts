import { describe, expect, it } from "vitest";
import { fatoresDeDesempate, resumoDesafios, textoDaCutucada, trofeusDoPerfil } from "./perfil";

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

describe("resumoDesafios", () => {
  const base = { criados: 2, chamado: 3, aceitos: 4, em_andamento: 0, chamou: 5, vitorias: 1, metas: 0 };
  it("sem a 0118, nada", () => expect(resumoDesafios(undefined, "Ana", false)).toBeNull());
  it("números com singular/plural e frase da vitória", () => {
    const r = resumoDesafios(base, "Ana", false)!;
    expect(r.numeros[0]).toEqual({ valor: 1, rotulo: "vitória", emoji: "🏆" });
    expect(r.numeros.find((n) => n.emoji === "📨")?.rotulo).toBe("convites recebidos");
    expect(r.frase).toBe("Ana já venceu 1 desafio. Tem coragem?");
  });
  it("em andamento vem primeiro; sem desafio convida", () => {
    expect(resumoDesafios({ ...base, em_andamento: 2 }, "Ana", true)!.frase).toBe("Você está em 2 desafios agora.");
    expect(resumoDesafios({ ...base, aceitos: 0, criados: 0 }, "Ana", false)!.frase).toContain("Seja o primeiro");
  });
});
