import { describe, expect, it } from "vitest";
import { conferirSerie } from "./conferencia";

const base = { repsPrescritas: "10-12", cargasReferencia: [20, 20, 22] };

describe("conferência de marcação", () => {
  it("valor normal não incomoda", () => {
    expect(conferirSerie({ ...base, carga: 22.5, reps: 11 })).toBeNull();
    expect(conferirSerie({ ...base, carga: 30, reps: 10 })).toBeNull(); // evoluiu bastante, mas plausível
  });

  it("200 kg quando costuma ser 20 kg → pergunta e sugere 20", () => {
    const a = conferirSerie({ ...base, carga: 200, reps: 10 });
    expect(a?.mensagem).toMatch(/200 kg/);
    expect(a?.sugestao).toEqual({ carga: 20, rotulo: "Era 20 kg" });
  });

  it("2 kg quando costuma ser 20 kg → sugere 20", () => {
    expect(conferirSerie({ ...base, carga: 2, reps: 10 })?.sugestao?.carga).toBe(20);
  });

  it("sem histórico: carga improvável para o grupo", () => {
    expect(conferirSerie({ carga: 250, reps: 10, repsPrescritas: "10", cargasReferencia: [], grupo: "biceps" })?.sugestao?.carga).toBe(25);
    expect(conferirSerie({ carga: 250, reps: 10, repsPrescritas: "10", cargasReferencia: [], grupo: "quadriceps" })).toBeNull(); // leg press
  });

  it("100 repetições quando o previsto é 10-12 → sugere 10", () => {
    expect(conferirSerie({ ...base, carga: 20, reps: 100 })?.sugestao).toEqual({ reps: 10, rotulo: "Eram 10 repetições" });
  });

  it("carga e repetições trocadas", () => {
    const a = conferirSerie({ repsPrescritas: "10-12", cargasReferencia: [40, 42], carga: 12, reps: 40 });
    expect(a?.sugestao).toMatchObject({ carga: 40, reps: 12 });
  });

  it("isometria em segundos não confere repetições", () => {
    expect(conferirSerie({ carga: null, reps: 60, repsPrescritas: "30", cargasReferencia: [], emSegundos: true })).toBeNull();
  });
});
