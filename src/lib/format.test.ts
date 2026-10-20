import { describe, expect, it } from "vitest";
import { dataBR } from "./format";

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
