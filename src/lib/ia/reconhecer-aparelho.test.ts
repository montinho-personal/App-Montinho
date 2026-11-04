import { describe, expect, it } from "vitest";
import { listaParaFoto } from "./reconhecer-aparelho";

describe("listaParaFoto", () => {
  it("leva músculo e equipamento para a IA separar aparelhos parecidos", () => {
    const l = listaParaFoto([
      { id: "a", nome: "Cadeira extensora", sinonimos: ["extensora"], grupo: "quadriceps", equipamento: ["maquina"] } as never,
      { id: "b", nome: "Tríceps na polia com corda", sinonimos: [] },
    ]);
    expect(l.split("\n")).toEqual(["1 | Cadeira extensora | quadriceps | maquina | extensora", "2 | Tríceps na polia com corda |  |  | "]);
  });
});
