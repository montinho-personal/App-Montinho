import { describe, expect, it } from "vitest";
import { lerVolumeColado } from "./volume-colado";

describe("colar o volume do site", () => {
  it("lê o formato do site e ignora o cabeçalho", () => {
    const r = lerVolumeColado("Montinho · séries por semana\nPeito: 10-14\nCostas: 12 a 16\nGlúteos – 14–18\nPosteriores de coxa: 8-12\nOmbro lateral: 8-12");
    expect(r.metas).toEqual({ peito: { min: 10, max: 14 }, costas: { min: 12, max: 16 }, gluteo: { min: 14, max: 18 }, posteriores: { min: 8, max: 12 }, ombro_lateral: { min: 8, max: 12 } });
    expect(r.naoEntendi).toEqual([]);
  });
  it("número só vira faixa fechada; sem acento e em uma linha com ;", () => {
    expect(lerVolumeColado("biceps 10; triceps: 8-10; quadriceps 12 - 16").metas).toEqual({ biceps: { min: 10, max: 10 }, triceps: { min: 8, max: 10 }, quadriceps: { min: 12, max: 16 } });
  });
  it("avisa o que não entendeu", () => {
    expect(lerVolumeColado("Peito: muitas\nPerna: 20").naoEntendi).toEqual(["Peito: muitas", "Perna: 20"]);
  });
});
