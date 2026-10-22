import { describe, expect, it } from "vitest";
import { GRUPO_LABEL } from "@/lib/grupos";
import { buscarExercicios, FILTROS_MONTADOR } from "./busca-exercicio";

const itens = [
  { nome: "Cadeira adutora", grupo: "adutores", sinonimos: ["adutora", "adução de quadril", "hip adduction"] },
  { nome: "Cadeira abdutora", grupo: "gluteo", sinonimos: ["abdutora"] },
  { nome: "Cadeira extensora", grupo: "quadriceps", sinonimos: ["extensora"] },
  { nome: "Prancha frontal", grupo: "core", sinonimos: [] },
  { nome: "Encolhimento com barra", grupo: "trapezio", sinonimos: [] },
];

describe("montador do visitante", () => {
  it("todo grupo muscular cai em algum filtro, uma vez só", () => {
    const todos = FILTROS_MONTADOR.flatMap((f) => f.grupos);
    for (const g of Object.keys(GRUPO_LABEL)) expect(todos.filter((x) => x === g)).toHaveLength(1);
  });

  it("acha a cadeira adutora pela busca e pelo filtro", () => {
    for (const q of ["adutora", "Cadeira adutora", "adutora cadeira", "ADUÇÃO", "cadeira adu"]) expect(buscarExercicios(itens, q, null).map((i) => i.nome)).toContain("Cadeira adutora");
    expect(buscarExercicios(itens, "", "adutores").map((i) => i.nome)).toEqual(["Cadeira adutora"]);
  });

  it("sem busca e sem filtro mostra a biblioteca inteira", () => {
    expect(buscarExercicios(itens, "", null)).toHaveLength(itens.length);
    expect(buscarExercicios(itens, "", "abdomen").map((i) => i.nome)).toEqual(["Prancha frontal"]);
    expect(buscarExercicios(itens, "", "ombro").map((i) => i.nome)).toEqual(["Encolhimento com barra"]);
  });
});
