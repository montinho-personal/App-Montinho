import { describe, expect, it } from "vitest";
import { avisoMeta, lerMeta, metasPorSerie, rotuloMeta, situacaoMeta } from "./meta-reps";

describe("meta de repetições", () => {
  it("lê número, faixa e ignora texto livre", () => {
    expect(lerMeta("12")).toEqual({ min: 12, max: 12 });
    expect(lerMeta("10-12")).toEqual({ min: 10, max: 12 });
    expect(lerMeta("8 a 10")).toEqual({ min: 8, max: 10 });
    expect(lerMeta("12 reps")).toEqual({ min: 12, max: 12 });
    expect(lerMeta("falha")).toBeNull();
    expect(lerMeta("30s")).toBeNull();
    expect(lerMeta("")).toBeNull();
  });

  it("pirâmide 20/15/12/10", () => {
    const metas = metasPorSerie(["20", "15", "12", "10"]);
    expect(metas.map((m) => (m ? rotuloMeta(m) : null))).toEqual(["20", "15", "12", "10"]);
    expect(situacaoMeta("18", metas[0])).toBe("abaixo");
    expect(situacaoMeta("15", metas[1])).toBe("na_meta");
    expect(situacaoMeta("14", metas[2])).toBe("acima");
    expect(situacaoMeta("", metas[3])).toBeNull();
  });

  it("aviso só quando o último treino ficou abaixo da meta", () => {
    const metas = metasPorSerie(["20", "15", "12", "10"]);
    expect(avisoMeta(metas, ["18", "15", "12", "10"])).toMatch(/passe dela/);
    expect(avisoMeta(metas, ["20", "16", "12", "11"])).toBeNull();
    expect(avisoMeta(metasPorSerie(["falha"]), ["8"])).toBeNull();
  });
});
