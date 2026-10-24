import { describe, expect, it } from "vitest";
import { avisoMeta, lerMeta, metasPorSerie, rotuloMeta, situacaoMeta, seriesQuePassaram, textoSubirPeso } from "./meta-reps";

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

describe("passou da meta → subir o peso", () => {
  const hoje = [{ serie: 0, tipo: "aquecimento" }, { serie: 1, tipo: "valida" }, { serie: 2, tipo: "valida" }, { serie: 3, tipo: "valida" }, { serie: 4, tipo: "valida" }];
  const metas = [null, ...metasPorSerie(["15", "12", "10", "10"])];

  it("avisa só as séries que passaram do topo da meta, com carga", () => {
    const ultima = [
      { serie: 1, reps: 20, carga_kg: 10, tipo: "valida" },
      { serie: 2, reps: 20, carga_kg: 20, tipo: "valida" },
      { serie: 3, reps: 10, carga_kg: 20, tipo: "valida" },
      { serie: 4, reps: 12, carga_kg: null, tipo: "valida" },
    ];
    const p = seriesQuePassaram(hoje, metas, ultima);
    expect(p.map((x) => x.serie)).toEqual([1, 2]);
    expect(textoSubirPeso(p)).toBe(
      "Na última vez você passou da meta — série 1: 20 reps com 10 kg (meta 15) e série 2: 20 reps com 20 kg (meta 12). Hoje dá para subir um pouco o peso nessas séries (a próxima anilha ou o próximo halter) e fazer dentro da faixa. Se a execução não ficar firme, volte ao peso anterior."
    );
  });

  it("faixa 10–12: 12 não passa, 13 passa; sem meta ou na meta, nada", () => {
    const m = [lerMeta("10-12")];
    const h = [{ serie: 1, tipo: "valida" }];
    expect(seriesQuePassaram(h, m, [{ serie: 1, reps: 12, carga_kg: 30, tipo: "valida" }])).toEqual([]);
    expect(seriesQuePassaram(h, m, [{ serie: 1, reps: 13, carga_kg: 30, tipo: "valida" }])).toHaveLength(1);
    expect(seriesQuePassaram(h, [null], [{ serie: 1, reps: 30, carga_kg: 30, tipo: "valida" }])).toEqual([]);
    expect(textoSubirPeso([])).toBeNull();
  });
});
