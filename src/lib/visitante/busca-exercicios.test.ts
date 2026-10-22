import { describe, expect, it } from "vitest";
import { GRUPO_LABEL } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { FILTROS_VISITANTE, filtrarExercicios, filtrosComItens } from "./busca-exercicios";

const I = (nome: string, grupo: GrupoMuscular, sinonimos: string[] = []) => ({ nome, grupo, sinonimos });
const itens = [
  I("Cadeira adutora", "adutores", ["adutora", "adução de quadril"]),
  I("Cadeira abdutora", "gluteo", ["abdutora"]),
  I("Supino reto com barra", "peito"),
  I("Elevação lateral com halteres", "ombro_lateral"),
  I("Encolhimento com halteres", "trapezio"),
];

describe("montador do visitante — busca e filtros", () => {
  it("todo músculo da biblioteca tem um botão (nenhum exercício fica escondido)", () => {
    const cobertos = new Set(FILTROS_VISITANTE.flatMap((f) => f.grupos));
    const faltando = (Object.keys(GRUPO_LABEL) as GrupoMuscular[]).filter((g) => !cobertos.has(g));
    expect(faltando).toEqual([]);
  });
  it("acha a cadeira adutora de vários jeitos", () => {
    for (const q of ["adutora", "cadeira adutora", "Adutores", "adução", "aducao quadril", "cadeira adut"]) expect(filtrarExercicios(itens, q, null).map((i) => i.nome), q).toContain("Cadeira adutora");
    expect(filtrarExercicios(itens, "", "adutores").map((i) => i.nome)).toEqual(["Cadeira adutora"]);
  });
  it("sem busca e sem filtro mostra tudo (sem limite)", () => {
    expect(filtrarExercicios(itens, "", null)).toHaveLength(itens.length);
  });
  it("botão Ombros junta as três porções; só aparecem botões com exercício", () => {
    expect(filtrarExercicios(itens, "", "ombros").map((i) => i.nome)).toEqual(["Elevação lateral com halteres"]);
    expect(filtrosComItens(itens).map((f) => f.valor)).toEqual(["peito", "ombros", "trapezio", "gluteo", "adutores"]);
  });
  it("busca pelo nome do músculo", () => {
    expect(filtrarExercicios(itens, "trapézio", null).map((i) => i.nome)).toEqual(["Encolhimento com halteres"]);
  });
});
