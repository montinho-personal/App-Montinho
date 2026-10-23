import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { itemDoCatalogo } from "@/lib/biblioteca/itens";
import { ditadoDaIA } from "./ditado-ia";

const itens = CATALOGO.map((e) => itemDoCatalogo(e));
const id = (slug: string) => `cat-${slug}`;

describe("ditado inteligente → prévia", () => {
  it("exercícios escolhidos pela IA viram linhas com séries, método e bloco", () => {
    const d = ditadoDaIA(
      {
        metodoGeral: null,
        treinos: [
          {
            nome: null,
            exercicios: [
              { falado: "rosca scot 3 de 12", bibliotecaId: id("rosca-scott-barra-w"), nomeLivre: null, series: 3, reps: "12", descansoSeg: null, cargaKg: null, metodo: null, bloco: null },
              { falado: "by set de desenvolvimento", bibliotecaId: id("desenvolvimento-halteres-sentado"), nomeLivre: null, series: 4, reps: "10", descansoSeg: 60, cargaKg: null, metodo: "biset", bloco: 1 },
              { falado: "com elevação frontal", bibliotecaId: id("elevacao-frontal-halteres"), nomeLivre: null, series: 4, reps: "10", descansoSeg: 60, cargaKg: null, metodo: "biset", bloco: 1 },
            ],
          },
        ],
      },
      itens
    );
    expect(d.exercicios.map((e) => e.escolhido?.nome)).toEqual(["Rosca Scott com barra W", "Desenvolvimento com halteres sentado", "Elevação frontal com halteres"]);
    expect(d.exercicios.every((e) => e.confianca === "alta")).toBe(true);
    expect(d.exercicios[1]).toMatchObject({ metodo: "biset", bloco: 1, series: 4, reps: "10", descansoSeg: 60 });
    expect(d.exercicios[0].candidatos[0].nome).toBe("Rosca Scott com barra W");
  });
  it("quando a IA não acha, sugere pela busca e pede para conferir", () => {
    const d = ditadoDaIA({ metodoGeral: "piramide", treinos: [{ nome: null, exercicios: [{ falado: "supino reto", bibliotecaId: null, nomeLivre: "supino reto", series: null, reps: null, descansoSeg: null, cargaKg: null, metodo: null, bloco: null }] }] }, itens);
    expect(d.metodoGeral).toBe("piramide");
    expect(d.exercicios[0].confianca).toBe("confira");
    expect(d.exercicios[0].candidatos.length).toBeGreaterThan(0);
  });
});
