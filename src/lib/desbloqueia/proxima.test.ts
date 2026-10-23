import { describe, expect, it } from "vitest";
import { proximaDescoberta, type EstadoDescoberta } from "./motor";

const I = (numero: number, estado: EstadoDescoberta) => ({ estado, conteudo: { id: `d${numero}`, numero } });

describe("próxima pergunta do Mito ou verdade", () => {
  const itens = [I(1, "explorado"), I(2, "explorado"), I(3, "disponivel"), I(4, "futuro"), I(5, "disponivel"), I(6, "futuro")];
  it("vai para a próxima liberada ainda não explorada, sempre para a frente", () => {
    expect(proximaDescoberta(itens, "d1", false)).toEqual({ id: "d3", biblioteca: false });
    expect(proximaDescoberta(itens, "d3", false)).toEqual({ id: "d5", biblioteca: false });
  });
  it("nunca volta para uma que a pessoa pulou (o “volta para a 13”)", () => {
    const pulou13 = [I(12, "explorado"), I(13, "disponivel"), I(14, "explorado"), I(15, "explorado")];
    expect(proximaDescoberta(pulou13, "d14", false)?.id).toBe("d15");
    expect(proximaDescoberta(pulou13, "d15", false)?.id).toBe("d12");
  });
  it("no fim do álbum continua pela biblioteca", () => {
    expect(proximaDescoberta(itens, "d5", false)).toEqual({ id: "d6", biblioteca: true });
  });
  it("pela biblioteca vale qualquer uma", () => {
    expect(proximaDescoberta(itens, "d3", true)).toEqual({ id: "d4", biblioteca: true });
  });
  it("tudo explorado: a seguinte, dando a volta; sozinha: nenhuma", () => {
    expect(proximaDescoberta([I(1, "explorado"), I(2, "explorado")], "d2", false)?.id).toBe("d1");
    expect(proximaDescoberta([I(1, "disponivel")], "d1", false)).toBeNull();
  });
});
