import { describe, expect, it } from "vitest";
import { CHAVE_BASE, baseDoAluno, basesDosProntos, filtrarBases } from "./treino-base";

describe("treino base do Meu treino", () => {
  const plano = { id: "A", titulo: "", seriesPorGrupo: [], dicas: [], treinos: [{ letra: "A", nome: "Pernas", minutos: 50, exercicios: [{ slug: "agachamento-livre", grupo: "quadriceps", series: 4, reps: "8-10", descansoSeg: 120, multi: true, prioridade: true }, { slug: "nao-existe", grupo: "quadriceps", series: 3, reps: "10", descansoSeg: 60, multi: false, prioridade: false }] }] } as never;
  it("pronto vira treino com os exercícios da biblioteca", () => {
    const g = basesDosProntos([{ slug: "rainha-do-agachamento", nome: "Rainha do Agachamento", emoji: "👑", chamada: "x", plano }], new Map([["agachamento-livre", { id: "b1", nome: "Agachamento livre" }]]));
    expect(g[0].treinos[0]).toMatchObject({ chave: "pronto:rainha-do-agachamento:A", itens: [{ biblioteca_id: "b1", nome: "Agachamento livre", series: 4, reps: "8-10" }] });
    expect(CHAVE_BASE.test(g[0].treinos[0].chave)).toBe(true);
  });
  it("protocolo do aluno: sem aquecimento, sem removidos, na ordem", () => {
    const g = baseDoAluno({ id: "a1", nome: "Ana Célia" }, [{ id: "t1", letra: "A", nome: "Superiores", exercicios: [{ nome: "Remada", biblioteca_id: null, series: 3, reps: "12", ordem: 2 }, { nome: "Supino", biblioteca_id: "s", series: 4, series_aquecimento: 1, reps: "10", ordem: 1 }, { nome: "Velho", biblioteca_id: null, series: 3, reps: "10", removido_em: "2026-01-01" }] }]);
    expect(g!.treinos[0].itens.map((i) => `${i.nome} ${i.series}`)).toEqual(["Supino 3", "Remada 3"]);
    expect(filtrarBases([g!], "celia")).toHaveLength(1);
    expect(filtrarBases([g!], "superiores")[0].treinos).toHaveLength(1);
    expect(filtrarBases([g!], "perna")).toHaveLength(0);
  });
});

describe("bi-set/tri-set do treino de hoje", () => {
  it("junta com o próximo e dá a técnica pelo tamanho", async () => {
    const { blocosDosJuntos } = await import("./treino-base");
    expect(blocosDosJuntos([{ juntoComProximo: true }, {}, { juntoComProximo: true }, { juntoComProximo: true }, {}, {}])).toEqual([
      { bloco: "A", tecnica: "biset" }, { bloco: "A", tecnica: "biset" },
      { bloco: "B", tecnica: "triset" }, { bloco: "B", tecnica: "triset" }, { bloco: "B", tecnica: "triset" },
      null,
    ]);
    expect(blocosDosJuntos([{}, { juntoComProximo: true }])).toEqual([null, null]);
  });
});
