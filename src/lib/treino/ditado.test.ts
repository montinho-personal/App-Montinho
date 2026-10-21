import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { itemDoCatalogo } from "@/lib/biblioteca/itens";
import { interpretarDitado, juntarFala, metodoFinal } from "./ditado";

const itens = CATALOGO.map((e) => itemDoCatalogo(e));
const nomes = (fala: string) => interpretarDitado(fala, itens).exercicios.map((e) => e.escolhido?.nome);

describe("ditar treino", () => {
  it("entende o exemplo do personal, sem vírgulas, com bi-set e pirâmide para todos", () => {
    const d = interpretarDitado(
      "eu quero um treino com crucifixo máquina supino reto inclinado supino reto barra elevação lateral e um biset de desenvolvimento com elevação frontal todos série pirâmide crescente",
      itens
    );
    const n = d.exercicios.map((e) => e.escolhido?.nome ?? "");
    expect(n).toHaveLength(6);
    expect(n[0]).toMatch(/^Crucifixo na máquina/);
    expect(n[1]).toMatch(/^Supino inclinado/);
    expect(n[2]).toBe("Supino reto com barra");
    expect(n[3]).toMatch(/^Elevação lateral/);
    expect(n[4]).toMatch(/^Desenvolvimento/);
    expect(n[5]).toMatch(/^Elevação frontal/);
    expect(d.metodoGeral).toBe("piramide");
    expect(d.exercicios[4].bloco).toBe(1);
    expect(d.exercicios[5].bloco).toBe(1);
    expect(d.exercicios[3].bloco).toBeNull();
    expect(metodoFinal(d.exercicios[0], d.metodoGeral)).toEqual({ tecnica: "piramide", piramide: "crescente" });
    expect(metodoFinal(d.exercicios[4], d.metodoGeral)).toEqual({ tecnica: "biset", piramide: "crescente" });
    expect(d.naoEntendido).toEqual([]);
  });

  it("eco do microfone (mesmas palavras em seguida) não duplica o exercício", () => {
    expect(nomes("supino reto barra supino reto barra crucifixo máquina")).toEqual(["Supino reto com barra", "Crucifixo na máquina (peck deck)"]);
  });

  it("com vírgulas também", () => {
    expect(nomes("Crucifixo máquina, supino inclinado, supino reto barra.")).toHaveLength(3);
  });

  it("séries, repetições e descanso grudam no exercício anterior", () => {
    const d = interpretarDitado("supino reto barra 4 de 8 a 10 descanso 90, crucifixo máquina 3x12, elevação lateral quatro por quinze descanso de 1 minuto e meio", itens);
    expect(d.exercicios.map((e) => [e.series, e.reps, e.descansoSeg])).toEqual([
      [4, "8-10", 90],
      [3, "12", null],
      [4, "15", 90],
    ]);
  });

  it("método falado depois do exercício vale só para ele", () => {
    const d = interpretarDitado("supino reto barra em drop set e crucifixo máquina", itens);
    expect(d.exercicios.map((e) => e.metodo)).toEqual(["dropset", null]);
    expect(d.metodoGeral).toBeNull();
  });

  it("“drop set na extensora” marca a extensora já ditada, sem repetir", () => {
    const d = interpretarDitado("cadeira extensora mesa flexora e stiff com drop set na extensora", itens);
    expect(d.exercicios.map((e) => [e.escolhido?.nome, e.metodo])).toEqual([
      ["Cadeira extensora", "dropset"],
      ["Mesa flexora", null],
      ["Stiff com barra", null],
    ]);
  });

  it("bi-set com 3 de 12 no fim vale para os dois", () => {
    const d = interpretarDitado("bi-set de tríceps corda com tríceps francês 3 de 12", itens);
    expect(d.exercicios).toHaveLength(2);
    expect(d.exercicios.every((e) => e.bloco === 1 && e.series === 3 && e.reps === "12")).toBe(true);
  });

  it("ignora o título do treino e avisa o que não entendeu", () => {
    const d = interpretarDitado("treino A de peito: supino reto barra, blablablu", itens);
    expect(d.exercicios.map((e) => e.escolhido?.nome)).toEqual(["Supino reto com barra"]);
    expect(d.naoEntendido).toEqual(["blablablu"]);
  });
});

describe("juntar o que o microfone entrega", () => {
  it("Android: a frase chega várias vezes enquanto cresce — fica uma só", () => {
    expect(juntarFala(["supino", "supino reto", "supino reto barra"])).toBe("supino reto barra");
  });
  it("computador: pedaços que se completam", () => {
    expect(juntarFala(["supino reto", "com barra"])).toBe("supino reto com barra");
  });
  it("ao religar, a última frase repetida não duplica", () => {
    expect(juntarFala(["crucifixo máquina supino inclinado", "supino inclinado", "Supino inclinado supino reto barra"])).toBe("crucifixo máquina supino inclinado supino reto barra");
  });
  it("frases diferentes seguidas continuam todas", () => {
    expect(juntarFala(["crucifixo máquina", "supino inclinado", "elevação lateral"])).toBe("crucifixo máquina supino inclinado elevação lateral");
  });
});
