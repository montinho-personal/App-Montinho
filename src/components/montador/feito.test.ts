import { describe, expect, it } from "vitest";
import { feitoDaLinha } from "./TabelaVolume";

describe("coluna Feito da tabela de volume", () => {
  it("Ombros (total) soma as partes; parte do abdômen fica sem número", () => {
    const feitas = { ombros: 1, ombro_anterior: 3, ombro_lateral: 4.5, peitoral: 6 };
    expect(feitoDaLinha({ grupo: "ombros", somaDasPartes: true }, feitas)).toBe(8.5);
    expect(feitoDaLinha({ grupo: "ombro_lateral" }, feitas)).toBe(4.5);
    expect(feitoDaLinha({ grupo: "abdomen_infra", parteDe: "abdomen" }, feitas)).toBeNull();
    expect(feitoDaLinha({ grupo: "biceps" }, feitas)).toBe(0);
  });
});
