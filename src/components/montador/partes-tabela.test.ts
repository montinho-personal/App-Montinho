import { describe, expect, it } from "vitest";
import { partesJuntoDoTotal } from "./TabelaVolume";

describe("partesJuntoDoTotal", () => {
  it("supra e infra ficam logo abaixo do Abdômen, não da Panturrilha", () => {
    const l = [
      { grupo: "quadriceps" }, { grupo: "abdomen" }, { grupo: "panturrilhas" },
      { grupo: "abdomen_supra", parteDe: "abdomen" }, { grupo: "abdomen_infra", parteDe: "abdomen" }, { grupo: "core" },
    ];
    expect(partesJuntoDoTotal(l).map((x) => x.grupo)).toEqual(["quadriceps", "abdomen", "abdomen_supra", "abdomen_infra", "panturrilhas", "core"]);
  });
  it("partes do ombro embaixo de Ombros (total)", () => {
    const l = [{ grupo: "ombro_lateral" }, { grupo: "peitoral" }, { grupo: "ombros", somaDasPartes: true }];
    expect(partesJuntoDoTotal(l).map((x) => x.grupo)).toEqual(["peitoral", "ombros", "ombro_lateral"]);
  });
});
