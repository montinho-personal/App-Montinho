import { describe, expect, it } from "vitest";
import { dataBR, diasAte } from "./format";

describe("dataBR", () => {
  it("data de calendário não muda com o fuso", () => {
    expect(dataBR("2026-09-17")).toBe("17/09/2026");
  });
  it("instante é exibido no horário de Brasília", () => {
    expect(dataBR("2026-09-17T02:00:00Z")).toBe("16/09/2026");
    expect(dataBR("2026-09-17T13:00:00Z")).toBe("17/09/2026");
  });
  it("vazio vira travessão", () => {
    expect(dataBR(null)).toBe("—");
  });
});

describe("diasAte (dias de calendário em Brasília)", () => {
  it("último dia às 22h de Brasília continua sendo o último dia (não “vencido”)", () => {
    const noite = new Date("2026-10-30T01:00:00Z"); // 29/10 às 22h em Brasília
    expect(diasAte("2026-10-29", noite)).toBe(0);
    expect(diasAte("2026-10-30", noite)).toBe(1);
    expect(diasAte("2026-10-28", noite)).toBe(-1);
  });
  it("aceita data com hora (convertida para o dia de Brasília)", () => {
    expect(diasAte("2026-10-31T02:59:59Z", new Date("2026-10-29T12:00:00Z"))).toBe(1);
  });
  it("sem data: null", () => {
    expect(diasAte(null)).toBeNull();
  });
});
