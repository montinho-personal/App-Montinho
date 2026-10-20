import { describe, expect, it } from "vitest";
import { CATALOGO } from "./catalogo";
import { itemDoCatalogo } from "./itens";
import { sugerirPesosSecundarios } from "./pesos";

const itens = CATALOGO.map((e) => itemDoCatalogo(e));
const id = (slug: string) => itens.find((i) => i.slug === slug)!.id;

describe("sugestão automática de pesos dos secundários", () => {
  it("supino novo (empurrar horizontal, peito) recebe tríceps e ombro anterior 0,5", () => {
    const s = sugerirPesosSecundarios("peito", "empurrar_horizontal", itens);
    expect(s.pesos).toEqual({ triceps: 0.5, ombro_anterior: 0.5 });
    expect(s.criterio).toBe("padrao_grupo");
  });

  it("puxada nova (puxar vertical, costas) recebe bíceps", () => {
    expect(sugerirPesosSecundarios("costas", "puxar_vertical", itens).pesos.biceps).toBe(0.5);
  });

  it("ao editar um exercício, ele próprio não entra na base", () => {
    const s = sugerirPesosSecundarios("peito", "empurrar_horizontal", itens, id("supino-reto-barra"));
    expect(s.baseadoEm).toBe(itens.filter((i) => i.padrao === "empurrar_horizontal" && i.grupo === "peito").length - 1);
  });

  it("isolados sem secundário relevante (tríceps na polia, extensora, panturrilha) não inventam número", () => {
    expect(sugerirPesosSecundarios("triceps", "extensao_cotovelo", itens).pesos).toEqual({});
    expect(sugerirPesosSecundarios("quadriceps", "extensao_joelho", itens).pesos).toEqual({});
    expect(sugerirPesosSecundarios("panturrilha", "flexao_plantar", itens).pesos).toEqual({});
  });

  it("músculo principal novo para o padrão: usa o padrão inteiro e nunca sugere o próprio principal", () => {
    const s = sugerirPesosSecundarios("triceps", "puxar_vertical", itens);
    expect(s.criterio).toBe("padrao");
    expect(s.pesos.triceps).toBeUndefined();
    expect(s.pesos.biceps).toBe(0.5);
  });

  it("sem padrão de movimento não sugere nada", () => {
    expect(sugerirPesosSecundarios("peito", null, itens)).toEqual({ pesos: {}, baseadoEm: 0, criterio: null });
  });
});
