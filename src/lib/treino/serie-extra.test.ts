import { describe, expect, it } from "vitest";
import { conviteSerieExtra, deficitRecente, type SessaoPassada } from "./serie-extra";

const agora = Date.parse("2026-10-20T12:00:00Z");
const dia = (n: number) => new Date(agora - n * 86_400_000).toISOString();
const alvo = { id: "sup", nome: "Supino reto", grupo: "peito" };

describe("deficitRecente", () => {
  it("usa só a última vez do exercício e soma o grupo na janela", () => {
    const sessoes: SessaoPassada[] = [
      { data: dia(2), exercicios: [{ exercicioId: "sup", nome: "Supino reto", grupo: "peito", planejadas: 4, feitas: 2 }, { exercicioId: "cru", nome: "Crucifixo", grupo: "peito", planejadas: 3, feitas: 2 }] },
      { data: dia(5), exercicios: [{ exercicioId: "sup", nome: "Supino reto", grupo: "peito", planejadas: 4, feitas: 0 }] },
      { data: dia(20), exercicios: [{ exercicioId: "sup", nome: "Supino reto", grupo: "peito", planejadas: 4, feitas: 0 }] },
    ];
    expect(deficitRecente(sessoes, alvo, agora)).toEqual({ exercicio: 2, grupo: 7 });
  });

  it("séries a mais em outro treino descontam do que faltou no grupo", () => {
    const sessoes: SessaoPassada[] = [
      { data: dia(1), exercicios: [{ exercicioId: "cru", nome: "Crucifixo", grupo: "peito", planejadas: 3, feitas: 5 }] },
      { data: dia(3), exercicios: [{ exercicioId: "sup", nome: "Supino reto", grupo: "peito", planejadas: 4, feitas: 1 }] },
    ];
    expect(deficitRecente(sessoes, alvo, agora)).toEqual({ exercicio: 3, grupo: 1 });
  });

  it("acha o exercício pelo nome quando o id mudou; série a mais não vira crédito negativo", () => {
    const sessoes: SessaoPassada[] = [{ data: dia(1), exercicios: [{ exercicioId: "x", nome: "supino reto ", grupo: "peito", planejadas: 3, feitas: 5 }] }];
    expect(deficitRecente(sessoes, alvo, agora)).toEqual({ exercicio: 0, grupo: 0 });
  });
});

describe("conviteSerieExtra", () => {
  it("faltou do exercício → repor, no máximo 2", () => {
    const c = conviteSerieExtra({ exercicio: 3, grupo: 5 }, { rotuloGrupo: "Peito" })!;
    expect(c.tom).toBe("repor");
    expect(c.sugeridas).toBe(2);
    expect(c.texto).toMatch(/3 séries deste exercício/);
  });

  it("faltou só do grupo → repor pelo grupo", () => {
    const c = conviteSerieExtra({ exercicio: 0, grupo: 1 }, { rotuloGrupo: "Peito" })!;
    expect(c.sugeridas).toBe(1);
    expect(c.texto).toMatch(/1 série de Peito/);
  });

  it("tudo em dia → incentivo; com desconforto/cansaço → nada", () => {
    expect(conviteSerieExtra({ exercicio: 2, grupo: 2 }, { rotuloGrupo: "Peito", cuidado: true })).toBeNull();
    expect(conviteSerieExtra({ exercicio: 0, grupo: 0 }, { rotuloGrupo: "Peito" })?.tom).toBe("bonus");
    expect(conviteSerieExtra({ exercicio: 0, grupo: 0 }, { rotuloGrupo: "Peito", cuidado: true })).toBeNull();
  });
});
