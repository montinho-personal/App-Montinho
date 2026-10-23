import { describe, expect, it } from "vitest";
import { proximaDescoberta, type EstadoDescoberta } from "./motor";

const I = (numero: number, estado: EstadoDescoberta) => ({ estado, conteudo: { id: `d${numero}`, numero } });

describe("próxima pergunta do Mito ou verdade", () => {
  const itens = [I(1, "explorado"), I(2, "explorado"), I(3, "disponivel"), I(4, "futuro"), I(5, "disponivel")];
  it("vai para a próxima ainda não explorada, pulando as bloqueadas no álbum", () => {
    expect(proximaDescoberta(itens, "d1", false)).toBe("d3");
    expect(proximaDescoberta(itens, "d3", false)).toBe("d5");
  });
  it("dá a volta no álbum", () => {
    expect(proximaDescoberta(itens, "d5", false)).toBe("d3");
  });
  it("pela biblioteca vale qualquer uma", () => {
    expect(proximaDescoberta(itens, "d3", true)).toBe("d4");
  });
  it("tudo explorado: a seguinte; sozinha: nenhuma", () => {
    expect(proximaDescoberta([I(1, "explorado"), I(2, "explorado")], "d2", false)).toBe("d1");
    expect(proximaDescoberta([I(1, "disponivel")], "d1", false)).toBeNull();
  });
});
