import { describe, expect, it } from "vitest";
import { ajusteDeBlocos, blocosComQuantidade, blocosPlanejados, camposLegados, cargasDosDrops, configEfetiva, exemploRestPause, instrucaoTecnica, resumoTecnica, seriesDeFinalizacao, somaBlocos } from "./tecnica-config";

describe("configEfetiva", () => {
  it("usa os padrões da técnica quando nada foi salvo", () => {
    expect(configEfetiva("rest_pause", {})).toMatchObject({ aplicar: "finalizacao", series: 1, repsAlvo: 20, pausaSeg: 15 });
    expect(configEfetiva("rest_pause", null)!.aplicar).toBe("principais"); // prescrição antiga
    expect(seriesDeFinalizacao("rest_pause", null)).toBe(0);
    expect(configEfetiva("dropset", undefined)).toMatchObject({ reps: 12, blocos: 2, reducaoPct: 20, pausaSeg: 0 });
    expect(configEfetiva("normal", {})).toBeNull();
  });
  it("respeita limites e mantém ‘sem total’ no rest-pause", () => {
    const c = configEfetiva("rest_pause", { series: 99, pausaSeg: -5, repsAlvo: null })!;
    expect(c.series).toBe(6);
    expect(c.pausaSeg).toBe(0);
    expect(c.repsAlvo).toBeNull();
  });
  it("cluster e 3/7 nunca viram finalização", () => {
    expect(configEfetiva("cluster", { aplicar: "finalizacao" })!.aplicar).toBe("principais");
  });
});

describe("séries de finalização", () => {
  it("conta só quando a técnica está no modo finalização", () => {
    expect(seriesDeFinalizacao("rest_pause", { series: 2 })).toBe(2);
    expect(seriesDeFinalizacao("rest_pause", { aplicar: "principais", series: 2 })).toBe(0);
    expect(seriesDeFinalizacao("cluster", {})).toBe(0);
    expect(seriesDeFinalizacao("normal", {})).toBe(0);
  });
  it("finalização não aplica a técnica nas principais (campos legados)", () => {
    expect(camposLegados("dropset", { series: 1, blocos: 3 }, 4)).toEqual({ tecnicaExtras: 3, tecnicaSeries: 0 });
    expect(camposLegados("dropset", { aplicar: "principais", series: 2, blocos: 1 }, 4)).toEqual({ tecnicaExtras: 1, tecnicaSeries: 2 });
    expect(camposLegados("dropset", null, 4)).toBeNull();
  });
});

describe("rest-pause e drop-set", () => {
  it("divide o total em ativação + minis", () => {
    expect(exemploRestPause(20)).toEqual([12, 5, 2, 1]);
    expect(exemploRestPause(20).reduce((a, b) => a + b, 0)).toBe(20);
  });
  it("rest-pause com nº de blocos escolhido (ex.: 3 blocos até somar 20)", () => {
    const b = blocosPlanejados("rest_pause", { blocos: 2, repsAlvo: 20 });
    expect(b).toHaveLength(3);
    expect(b.map((x) => Number(x.meta.replace("~", ""))).reduce((a, n) => a + n, 0)).toBe(20);
    expect(exemploRestPause(20, 3)).toEqual([12, 5, 3]);
    expect(resumoTecnica("rest_pause", { blocos: 2 })).toBe("1× no final · 3 blocos · meta 20 reps · pausas de 15 s");
    // Sem blocos escolhidos (prescrição antiga): continua pelo total.
    expect(blocosPlanejados("rest_pause", { repsAlvo: 20 })).toHaveLength(4);
    expect(camposLegados("rest_pause", { blocos: 3 }, 4)).toEqual({ tecnicaExtras: 3, tecnicaSeries: 0 });
  });
  it("calcula as cargas dos drops com arredondamento de academia", () => {
    expect(cargasDosDrops(50, 2, 20)).toEqual([40, 32]);
    expect(cargasDosDrops(12, 2, 25)).toEqual([9, 7]);
  });
  it("blocos para o aluno preencher", () => {
    const d = blocosPlanejados("dropset", { blocos: 2, reducaoPct: 20 });
    expect(d.map((b) => b.rotulo)).toEqual(["Carga inicial", "Drop 1 (−20%)", "Drop 2 (−20%)"]);
    expect(d[2].fracaoCarga).toBeCloseTo(0.64);
    expect(blocosPlanejados("tres_sete", {}).map((b) => b.meta)).toEqual(["3", "4", "5", "6", "7"]);
    expect(blocosPlanejados("myo_reps", { blocos: 3 })).toHaveLength(4);
    expect(somaBlocos(["12", "5", "", "3"])).toBe(20);
  });
});

describe("textos", () => {
  it("resume e explica em português", () => {
    expect(resumoTecnica("rest_pause", {})).toBe("1× no final · meta 20 reps · pausas de 15 s");
    expect(resumoTecnica("dropset", { blocos: 1 })).toBe("1× no final · 12 reps + 1 drop de −20% · sem descanso");
    expect(instrucaoTecnica("rest_pause", { series: 2 })).toContain("2 séries de finalização");
    expect(instrucaoTecnica("negativo", {})).toContain("4 s descendo");
  });
});

describe("pôr e tirar drops, mini-séries e blocos na série", () => {
  it("drop-set: mais um drop segue tirando a mesma porcentagem; menos um drop encurta", () => {
    const tres = blocosComQuantidade("dropset", {}, "12", 4);
    expect(tres.map((b) => b.rotulo)).toEqual(["Carga inicial", "Drop 1 (−20%)", "Drop 2 (−20%)", "Drop 3 (−20%)"]);
    expect(tres[3].fracaoCarga).toBeCloseTo(0.8 ** 3);
    expect(blocosComQuantidade("dropset", {}, "12", 2).map((b) => b.rotulo)).toEqual(["Carga inicial", "Drop 1 (−20%)"]);
  });
  it("nunca abaixo do mínimo nem acima do máximo", () => {
    expect(blocosComQuantidade("dropset", {}, "12", 1)).toHaveLength(2);
    expect(blocosComQuantidade("dropset", {}, "12", 50)).toHaveLength(ajusteDeBlocos("dropset")!.maximo);
    expect(blocosComQuantidade("cluster", {}, null, 0)).toHaveLength(1);
  });
  it("rest-pause, myo-reps e cluster mudam a quantidade de mini-séries/blocos", () => {
    expect(blocosComQuantidade("rest_pause", {}, null, 4).map((b) => b.rotulo)).toEqual(["Até perto da falha", "Mini 1", "Mini 2", "Mini 3"]);
    expect(blocosComQuantidade("myo_reps", {}, null, 3).map((b) => b.rotulo)).toEqual(["Ativação", "Mini 1", "Mini 2"]);
    expect(blocosComQuantidade("cluster", {}, null, 5).map((b) => b.rotulo)).toEqual(["Bloco 1", "Bloco 2", "Bloco 3", "Bloco 4", "Bloco 5"]);
  });
  it("3/7: o protocolo fica, e o que passar vira bloco extra", () => {
    expect(blocosComQuantidade("tres_sete", {}, null, 6).map((b) => b.rotulo)).toEqual(["3 reps", "4 reps", "5 reps", "6 reps", "7 reps", "Extra 1"]);
    expect(blocosComQuantidade("tres_sete", {}, null, 4)).toHaveLength(4);
  });
  it("sem técnica em blocos não há ajuste", () => {
    expect(ajusteDeBlocos("piramide")).toBeNull();
    expect(ajusteDeBlocos("dropset")!.unidade).toBe("drop");
  });
});
