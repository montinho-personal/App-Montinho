import { describe, expect, it } from "vitest";
import { marcosDesafios, placarDesafio, recadoDoPlacar, resumoDesafio, semanasDoDesafio, situacaoDesafio, type ParticipanteDados } from "./regras";

const p = (alunoId: string, treinos: string[], extra: Partial<ParticipanteDados> = {}): ParticipanteDados => ({ alunoId, nome: alunoId, status: "aceito", eu: false, criador: false, treinos, ...extra });

describe("placar dos desafios", () => {
  it("mais treinos: 1 por dia (Brasília), fora do período não conta, convidado não entra", () => {
    const r = placarDesafio({ tipo: "mais_treinos", meta: null, inicio: "2026-10-01", fim: "2026-10-07" }, [
      // 02/10 às 01h UTC = 01/10 22h em Brasília; dois no mesmo dia contam 1
      p("Denis", ["2026-10-02T01:00:00Z", "2026-10-02T12:00:00Z", "2026-10-02T20:00:00Z", "2026-10-09T12:00:00Z"]),
      p("Reinaldo", ["2026-10-03T12:00:00Z"]),
      p("Ana", ["2026-10-03T12:00:00Z"], { status: "convidado" }),
    ]);
    expect(r.map((l) => [l.nome, l.pontos, l.posicao, l.cumpriu])).toEqual([["Denis", 2, 1, true], ["Reinaldo", 1, 2, false]]);
    expect(r[0].rotulo).toBe("2 treinos");
  });

  it("o que conta: só musculação (padrão), só cardio ou os dois (até 2 por dia)", () => {
    const base = { tipo: "mais_treinos" as const, meta: null, inicio: "2026-10-01", fim: "2026-10-03" };
    const ps = [
      p("Ana", ["2026-10-01T12:00:00Z", "2026-10-02T12:00:00Z"], { cardios: ["2026-10-01T22:00:00Z", "2026-10-01T23:00:00Z"] }),
      p("Bia", ["2026-10-02T12:00:00Z"], { cardios: ["2026-10-01T12:00:00Z", "2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z"] }),
    ];
    expect(placarDesafio(base, ps).map((l) => [l.nome, l.pontos])).toEqual([["Ana", 2], ["Bia", 1]]);
    const cardio = placarDesafio({ ...base, atividades: "cardio" }, ps);
    expect(cardio.map((l) => [l.nome, l.pontos])).toEqual([["Bia", 3], ["Ana", 1]]);
    expect(cardio[0].rotulo).toBe("3 cardios");
    const ambos = placarDesafio({ ...base, atividades: "ambos" }, ps);
    expect(ambos.map((l) => [l.nome, l.pontos])).toEqual([["Bia", 4], ["Ana", 3]]);
    expect(ambos[0].rotulo).toBe("4 atividades (1 musc. + 3 cardio)");
    // Tipos de peso ignoram a escolha.
    expect(placarDesafio({ ...base, tipo: "madrugador", atividades: "cardio" }, ps)[0].rotulo).toContain("treino");
    expect(resumoDesafio({ ...base, atividades: "ambos" })).toContain("musculação e cardio");
  });

  it("empate no 1º lugar: os dois são campeões; sozinho no desafio não é campeão", () => {
    const d = { tipo: "mais_treinos" as const, meta: null, inicio: "2026-10-01", fim: "2026-10-07" };
    const r = placarDesafio(d, [p("A", ["2026-10-02T12:00:00Z"]), p("B", ["2026-10-03T12:00:00Z"])]);
    expect(r.map((l) => [l.posicao, l.cumpriu])).toEqual([[1, true], [1, true]]);
    expect(placarDesafio(d, [p("A", ["2026-10-02T12:00:00Z"])])[0].cumpriu).toBe(false);
  });

  it("meta fixa e madrugador", () => {
    const meta = placarDesafio({ tipo: "meta_fixa", meta: 2, inicio: "2026-10-01", fim: "2026-10-07" }, [p("A", ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z", "2026-10-04T12:00:00Z"]), p("B", ["2026-10-02T12:00:00Z"])]);
    expect(meta.map((l) => [l.nome, l.rotulo, l.cumpriu])).toEqual([["A", "2 de 2 treinos", true], ["B", "1 de 2 treinos", false]]);
    // 08h UTC = 05h Brasília (conta); 10h UTC = 07h (não conta)
    const cedo = placarDesafio({ tipo: "madrugador", meta: null, inicio: "2026-10-01", fim: "2026-10-07" }, [p("A", ["2026-10-02T08:00:00Z", "2026-10-03T10:00:00Z"]), p("B", [])]);
    expect(cedo[0]).toMatchObject({ nome: "A", pontos: 1, rotulo: "1 treino antes das 6h", cumpriu: true });
  });

  it("semana em dia: precisa de N treinos em todas as semanas completas", () => {
    expect(semanasDoDesafio("2026-10-01", "2026-10-14")).toHaveLength(2);
    const r = placarDesafio({ tipo: "semanas", meta: 2, inicio: "2026-10-01", fim: "2026-10-14" }, [
      p("A", ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z", "2026-10-09T12:00:00Z", "2026-10-10T12:00:00Z"]),
      p("B", ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z", "2026-10-09T12:00:00Z"]),
    ]);
    expect(r.map((l) => [l.nome, l.rotulo, l.cumpriu])).toEqual([["A", "2 de 2 semanas", true], ["B", "1 de 2 semanas", false]]);
  });

  it("situação, resumo e troféus", () => {
    expect(situacaoDesafio({ inicio: "2026-10-10", fim: "2026-10-16", cancelado: false }, "2026-10-09")).toBe("agendado");
    expect(situacaoDesafio({ inicio: "2026-10-10", fim: "2026-10-16", cancelado: false }, "2026-10-16")).toBe("andamento");
    expect(situacaoDesafio({ inicio: "2026-10-10", fim: "2026-10-16", cancelado: false }, "2026-10-17")).toBe("encerrado");
    expect(resumoDesafio({ tipo: "semanas", meta: 3, inicio: "2026-10-24", fim: "2026-11-06" })).toBe("Semana em dia · 3× por semana · 24/10 a 06/11");
    const m = marcosDesafios([
      { id: "d2", fim: "2026-10-20", souCriador: true, aceitos: 1, venci: false, cumpri: false, aceitei: true },
      { id: "d1", fim: "2026-10-10", souCriador: true, aceitos: 3, venci: true, cumpri: false, aceitei: true },
      { id: "d3", fim: "2026-10-30", souCriador: false, aceitos: 2, venci: false, cumpri: true, aceitei: true },
    ]);
    expect(m).toMatchObject({ criador: "2026-10-10", campeao: "2026-10-10", palavra: "2026-10-30", nato: "2026-10-30" });
  });
});

describe("desafios de peso, corrida e time", () => {
  const s = (em: string, carga: number, reps: number, extra: Partial<{ bibliotecaId: string; grupo: string }> = {}) => ({ em, carga, reps, bibliotecaId: extra.bibliotecaId ?? null, grupo: extra.grupo ?? null });
  const P = (alunoId: string, treinos: string[], series: ReturnType<typeof s>[] = [], recordes: string[] = []) => ({ alunoId, nome: alunoId, status: "aceito" as const, eu: alunoId === "A", criador: false, treinos, series, recordes });

  it("corrida: vence quem chega primeiro, não quem fez mais depois", () => {
    const r = placarDesafio({ tipo: "corrida", meta: 2, inicio: "2026-10-01", fim: "2026-10-30" }, [
      P("A", ["2026-10-02T12:00:00Z", "2026-10-05T12:00:00Z", "2026-10-06T12:00:00Z"]),
      P("B", ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z"]),
    ]);
    expect(r.map((l) => [l.nome, l.posicao, l.cumpriu])).toEqual([["B", 1, true], ["A", 2, false]]);
    expect(r[0].rotulo).toBe("🏁 chegou aos 2 em 03/10");
  });

  it("peso de hoje (volume em 1 dia) e treino do desafio (só os exercícios escolhidos)", () => {
    const v = placarDesafio({ tipo: "volume", meta: null, inicio: "2026-10-05", fim: "2026-10-05" }, [
      P("A", ["2026-10-05T12:00:00Z"], [s("2026-10-05T12:00:00Z", 100, 10), s("2026-10-05T12:00:00Z", 50, 10), s("2026-10-04T12:00:00Z", 500, 10)]),
      P("B", ["2026-10-05T12:00:00Z"], [s("2026-10-05T12:00:00Z", 60, 20)]),
    ]);
    expect(v.map((l) => [l.nome, l.pontos, l.rotulo])).toEqual([["A", 1500, "1.500 kg"], ["B", 1200, "1.200 kg"]]);
    const t = placarDesafio({ tipo: "treino_desafio", meta: null, inicio: "2026-10-01", fim: "2026-10-07", exercicios: [{ id: "agacho", nome: "Agachamento" }] }, [
      P("A", [], [s("2026-10-02T12:00:00Z", 100, 10, { bibliotecaId: "agacho" }), s("2026-10-02T12:00:00Z", 300, 10, { bibliotecaId: "supino" })]),
      P("B", [], [s("2026-10-02T12:00:00Z", 80, 15, { bibliotecaId: "agacho" })]),
    ]);
    expect(t.map((l) => [l.nome, l.pontos])).toEqual([["B", 1200], ["A", 1000]]);
  });

  it("evolução: compara com a própria média das 4 semanas antes; sem base fica no fim", () => {
    const r = placarDesafio({ tipo: "evolucao", meta: null, inicio: "2026-10-29", fim: "2026-11-04" }, [
      // base: 4 semanas com 1.000 kg/semana; período (7 dias): 1.500 kg → +50%
      P("A", [], [s("2026-10-05T12:00:00Z", 100, 10), s("2026-10-12T12:00:00Z", 100, 10), s("2026-10-19T12:00:00Z", 100, 10), s("2026-10-26T12:00:00Z", 100, 10), s("2026-10-30T12:00:00Z", 150, 10)]),
      P("B", [], [s("2026-10-30T12:00:00Z", 999, 10)]),
    ]);
    expect(r.map((l) => [l.nome, l.pontos, l.rotulo])).toEqual([["A", 50, "+50% de volume por semana"], ["B", 0, "sem treinos nas 4 semanas antes para comparar"]]);
  });

  it("músculo da vez, recordes e time", () => {
    const m = placarDesafio({ tipo: "musculo", meta: null, inicio: "2026-10-01", fim: "2026-10-07", foco: "pernas" }, [
      P("A", [], [s("2026-10-02T12:00:00Z", 10, 10, { grupo: "quadriceps" }), s("2026-10-02T12:00:00Z", 10, 10, { grupo: "peito" })]),
      P("B", [], [s("2026-10-02T12:00:00Z", 10, 10, { grupo: "gluteo" }), s("2026-10-02T12:00:00Z", 10, 10, { grupo: "posteriores" })]),
    ]);
    expect(m.map((l) => [l.nome, l.rotulo])).toEqual([["B", "2 séries de pernas"], ["A", "1 série de pernas"]]);
    const rec = placarDesafio({ tipo: "recordes", meta: null, inicio: "2026-10-01", fim: "2026-10-07" }, [P("A", [], [], ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z"]), P("B", [], [], ["2026-09-30T12:00:00Z"])]);
    expect(rec.map((l) => [l.nome, l.pontos, l.cumpriu])).toEqual([["A", 2, true], ["B", 0, false]]);
    const time = placarDesafio({ tipo: "dupla", meta: 3, inicio: "2026-10-01", fim: "2026-10-07" }, [P("A", ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z"]), P("B", ["2026-10-02T12:00:00Z"])]);
    expect(time.every((l) => l.cumpriu)).toBe(true);
  });

  it("recado do placar", () => {
    const d = { tipo: "mais_treinos" as const, meta: null, inicio: "2026-10-01", fim: "2026-10-07", nome: "Duelo" };
    const placar = placarDesafio(d, [P("A", ["2026-10-02T12:00:00Z"]), P("B", ["2026-10-02T12:00:00Z", "2026-10-03T12:00:00Z"])]);
    expect(recadoDoPlacar(d, placar, "2026-10-05")).toBe("⚔️ B está na frente em “Duelo” (você em 2º), faltam 2 dias. Bora virar!");
    expect(recadoDoPlacar(d, placar, "2026-10-08")).toBeNull();
  });
});
