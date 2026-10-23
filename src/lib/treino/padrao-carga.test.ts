import { describe, expect, it } from "vitest";
import { anotaCarga, rotuloColunaCarga, tipoDePeso } from "./padrao-carga";

describe("padrão de carga", () => {
  it("reconhece anilhas e halteres", () => {
    expect(tipoDePeso({ nome: "Agachamento livre", equipamento: ["barra"] })).toBe("anilhas");
    expect(tipoDePeso({ nome: "Supino no Smith", equipamento: ["smith", "banco"] })).toBe("anilhas");
    expect(tipoDePeso({ nome: "Leg press 45°", equipamento: ["maquina"] })).toBe("anilhas");
    expect(tipoDePeso({ nome: "Rosca alternada com halteres", equipamento: ["halter"] })).toBe("halteres");
  });
  it("não pergunta em máquina, polia ou halter único", () => {
    expect(tipoDePeso({ nome: "Cadeira extensora", equipamento: ["maquina"] })).toBeNull();
    expect(tipoDePeso({ nome: "Puxada na polia", equipamento: ["polia"] })).toBeNull();
    expect(tipoDePeso({ nome: "Remada unilateral com halter", equipamento: ["halter", "banco"] })).toBeNull();
    expect(tipoDePeso({ nome: "Agachamento goblet", equipamento: ["halter"] })).toBeNull();
    expect(tipoDePeso({ nome: "Rosca concentrada", equipamento: ["halter"], unilateral: true })).toBeNull();
  });
  it("rótulo da coluna segue a escolha", () => {
    expect(rotuloColunaCarga("anilhas", "total")).toBe("Total (kg)");
    expect(rotuloColunaCarga("anilhas", "por_lado")).toBe("Por lado (kg)");
    expect(rotuloColunaCarga("halteres", "por_lado")).toBe("1 halter (kg)");
    expect(rotuloColunaCarga("halteres", null)).toBe("Carga (kg)");
    expect(rotuloColunaCarga(null, "total")).toBe("Carga (kg)");
  });
  it("lembrete do aparelho só onde se anota carga", () => {
    expect(anotaCarga(["maquina"])).toBe(true);
    expect(anotaCarga([])).toBe(true);
    expect(anotaCarga(["peso_corporal"])).toBe(false);
    expect(anotaCarga(["barra_fixa", "peso_corporal"])).toBe(false);
    expect(anotaCarga(["peso_corporal", "anilha"])).toBe(true);
  });
});
