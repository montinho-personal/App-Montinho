import { describe, expect, it } from "vitest";
import { marcosDesafios, placarDesafio, resumoDesafio, semanasDoDesafio, situacaoDesafio, type ParticipanteDados } from "./regras";

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
