import { describe, expect, it } from "vitest";
import { progressoMonitoramento, trofeusDeMonitoramento } from "./monitoramento";

// Segundas-feiras: 05/10, 12/10, 19/10, 26/10/2026.
const r = (d: string) => `${d}T15:00:00Z`;

describe("monitoramento: avaliação/medidas semana após semana", () => {
  it("4 semanas seguidas dão o 1º troféu, na data do registro da 4ª semana", () => {
    const t = trofeusDeMonitoramento([r("2026-10-06"), r("2026-10-13"), r("2026-10-21"), r("2026-10-27")], "2026-10-30");
    expect(t.map((x) => [x.codigo, x.data])).toEqual([["monitoramento_4", r("2026-10-27")]]);
  });

  it("vários registros no mesmo dia (ou semana) contam uma semana só", () => {
    expect(trofeusDeMonitoramento([r("2026-10-27"), r("2026-10-27"), r("2026-10-28"), r("2026-10-29")], "2026-10-30")).toEqual([]);
    expect(progressoMonitoramento([r("2026-10-27"), r("2026-10-28")], "2026-10-30")).toEqual({ seguidas: 1, estaSemana: true, proximo: 4 });
  });

  it("semana sem registro zera; a semana atual ainda aberta não quebra", () => {
    const regs = [r("2026-09-28"), r("2026-10-06"), r("2026-10-20")];
    expect(progressoMonitoramento(regs, "2026-10-30")).toEqual({ seguidas: 1, estaSemana: false, proximo: 4 });
    expect(progressoMonitoramento([r("2026-10-13"), r("2026-10-20")], "2026-10-30")).toEqual({ seguidas: 2, estaSemana: false, proximo: 4 });
  });

  it("semana pausada não quebra a sequência", () => {
    const regs = [r("2026-09-29"), r("2026-10-06"), r("2026-10-20"), r("2026-10-27")];
    expect(trofeusDeMonitoramento(regs, "2026-10-30")).toEqual([]);
    expect(trofeusDeMonitoramento(regs, "2026-10-30", ["2026-10-12"]).map((x) => x.codigo)).toEqual(["monitoramento_4"]);
  });

  it("26 semanas seguidas dão os 4 marcos, cada um uma vez", () => {
    const regs = Array.from({ length: 26 }, (_, i) => new Date(Date.UTC(2026, 3, 7) + i * 7 * 86_400_000).toISOString());
    expect(trofeusDeMonitoramento(regs, "2026-10-30").map((x) => x.codigo)).toEqual(["monitoramento_4", "monitoramento_8", "monitoramento_12", "monitoramento_26"]);
    expect(progressoMonitoramento([], "2026-10-30")).toEqual({ seguidas: 0, estaSemana: false, proximo: 4 });
  });
});
