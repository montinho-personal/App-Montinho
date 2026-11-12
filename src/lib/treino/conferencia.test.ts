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

describe("anilhas/halteres: dobro, metade e bem acima (04/11/2026)", () => {
  const anilhaPorLado = { tipo: "anilhas" as const, modo: "por_lado" as const };
  it("dobro do normal pergunta se anotou a soma e sugere a metade", () => {
    const a = conferirSerie({ carga: 80, reps: 10, cargasReferencia: [40, 40], padrao: anilhaPorLado });
    expect(a?.mensagem).toMatch(/dobro.*Você anota só um lado.*a soma dos dois lados/);
    expect(a?.sugestao).toEqual({ carga: 40, rotulo: "Era 40 kg" });
  });
  it("metade do normal com quem anota a soma", () => {
    const a = conferirSerie({ carga: 20, reps: 10, cargasReferencia: [40], padrao: { tipo: "halteres", modo: "total" } });
    expect(a?.mensagem).toMatch(/metade.*os dois halteres somados.*o peso de um halter/);
    expect(a?.sugestao?.carga).toBe(40);
  });
  it("bem acima do normal (sem ser o dobro) só pergunta", () => {
    const a = conferirSerie({ carga: 70, reps: 10, cargasReferencia: [40] });
    expect(a).toEqual({ mensagem: expect.stringMatching(/bem acima/), sugestao: null });
  });
  it("progressão normal não pergunta", () => {
    expect(conferirSerie({ carga: 45, reps: 10, cargasReferencia: [40], padrao: anilhaPorLado })).toBeNull();
    expect(conferirSerie({ carga: 6, reps: 12, cargasReferencia: [3], padrao: anilhaPorLado })).toBeNull(); // 3 → 6 kg: diferença pequena
  });
});

describe("vírgula que sumiu (12/11/2026, caso da Brigida)", () => {
  it("585 com referência de 45–54 vira 58,5; 495 vira 49,5", async () => {
    const { virgulaPerdida } = await import("./conferencia");
    expect(virgulaPerdida(585, [45, 495, 54])).toBe(58.5);
    expect(virgulaPerdida(495, [45, 54, 585])).toBe(49.5);
  });
  it("não mexe em subida de verdade nem em aquecimento leve", async () => {
    const { virgulaPerdida } = await import("./conferencia");
    expect(virgulaPerdida(100, [40, 80, 90])).toBeNull();
    expect(virgulaPerdida(200, [20, 40, 80])).toBeNull();
    expect(virgulaPerdida(60, [55])).toBeNull();
  });
  it("sem referência, só acima do limite do grupo", async () => {
    const { virgulaPerdida } = await import("./conferencia");
    expect(virgulaPerdida(585, [])).toBe(58.5);
    expect(virgulaPerdida(250, [])).toBeNull();
    expect(virgulaPerdida(125, [], "biceps")).toBe(12.5);
    expect(virgulaPerdida(585, [600])).toBeNull();
  });
});
