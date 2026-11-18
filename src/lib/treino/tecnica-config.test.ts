import { describe, expect, it } from "vitest";
import { ajusteDeBlocos, blocosComQuantidade, blocosPlanejados, camposLegados, cargasDosDrops, configEfetiva, exemploRestPause, instrucaoTecnica, resumoTecnica, seriesDeFinalizacao, somaBlocos, ondeEntra, configDoOnde, atalhoAtivo, previaDoAluno } from "./tecnica-config";

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

import { repsParaSugerir } from "./tecnica-config";
describe("repsParaSugerir (dica de reps da última vez)", () => {
  it("cluster da última vez não vira dica numa série normal; mesma técnica continua", () => {
    expect(repsParaSugerir({ tipo: "cluster", reps: 19 }, "valida")).toBeNull();
    expect(repsParaSugerir({ tipo: "cluster", reps: 19 }, "cluster")).toBe(19);
    expect(repsParaSugerir({ tipo: "valida", reps: 12 }, "valida")).toBe(12);
    expect(repsParaSugerir({ tipo: "piramide", reps: 10 }, "valida")).toBe(10);
    expect(repsParaSugerir(null, "valida")).toBeNull();
  });
});

import { blocosDaUltimaVez, textoDosBlocos } from "./tecnica-config";
describe("drops da última vez", () => {
  const antes = [
    { tipo: "valida", blocos: null },
    { tipo: "dropset", blocos: [{ carga: 40, reps: 12 }, { carga: 30, reps: 8 }, { carga: 22.5, reps: 6 }] },
    { tipo: "dropset", blocos: [{ carga: 40, reps: 10 }, { carga: 30, reps: 7 }] },
  ];
  it("pega a mesma série em blocos da última vez e escreve cada drop", () => {
    expect(textoDosBlocos(blocosDaUltimaVez(antes, "dropset", 0)!)).toBe("40 kg × 12 → 30 kg × 8 → 22,5 kg × 6");
    expect(blocosDaUltimaVez(antes, "dropset", 1)!.length).toBe(2);
    expect(blocosDaUltimaVez(antes, "dropset", 5)!.length).toBe(2);
    expect(blocosDaUltimaVez(antes, "cluster", 0)).toBeNull();
  });
});

describe("técnica em frase (montador)", () => {
  it("onde entra: última, série a mais, todas", () => {
    expect(ondeEntra("dropset", {}, 4)).toBe("extra");
    expect(ondeEntra("dropset", configDoOnde({}, "ultima", 4), 4)).toBe("ultima");
    expect(ondeEntra("dropset", configDoOnde({}, "todas", 4), 4)).toBe("todas");
    expect(ondeEntra("dropset", { aplicar: "principais", series: 2 }, 4)).toBe("outro");
    expect(ondeEntra("dropset", { aplicar: "finalizacao", series: 2 }, 4)).toBe("outro");
    expect(ondeEntra("cluster", {}, 4)).toBeNull();
  });
  it("trocar onde entra não mexe nos números da técnica", () => {
    expect(configDoOnde({ blocos: 3, reducaoPct: 25 }, "ultima", 4)).toEqual({ blocos: 3, reducaoPct: 25, aplicar: "principais", series: 1 });
    expect(configDoOnde({}, "todas", 9).series).toBe(6);
  });
  it("atalho ativo quando os números batem", () => {
    expect(atalhoAtivo("dropset", {}, { blocos: 2, reducaoPct: 20 })).toBe(true);
    expect(atalhoAtivo("dropset", { blocos: 1 }, { blocos: 2, reducaoPct: 20 })).toBe(false);
  });
  it("prévia: drop-set na última série não aumenta o total", () => {
    const p = previaDoAluno("dropset", { aplicar: "principais", series: 1 }, 4, "Drop-set", "10-12", 50)!;
    expect(p.total).toBe(4);
    expect(p.linhas.map((l) => l.texto)).toEqual(["Séries 1 a 3: 10-12 reps", "Série 4 com Drop-set: 50 kg → 40 kg → 32 kg"]);
  });
  it("prévia: série a mais no fim soma no total; sem carga usa exemplo", () => {
    const p = previaDoAluno("dropset", {}, 3, "Drop-set", "12")!;
    expect(p.total).toBe(4);
    expect(p.linhas[1].texto).toBe("＋ 1 série de Drop-set no fim: ex.: 50 kg → 40 kg → 32 kg");
  });
  it("prévia: cluster vale para todas as séries", () => {
    const p = previaDoAluno("cluster", {}, 4, "Cluster")!;
    expect(p.linhas).toEqual([{ texto: "Todas as 4 séries com Cluster: 4 + 4 + 4 reps · 20 s entre blocos", tecnica: true }]);
  });
});

describe("prévia com reps série a série", () => {
  it("mostra só as reps das séries normais", () => {
    const p = previaDoAluno("dropset", { aplicar: "principais", series: 1 }, 4, "Drop-set", "12/10/8/6", 50)!;
    expect(p.linhas[0].texto).toBe("Séries 1 a 3: 12 / 10 / 8 reps");
  });
  it("rest-pause sem blocos escolhidos: nenhum atalho de blocos ativo", () => {
    expect(atalhoAtivo("rest_pause", {}, { blocos: 2, pausaSeg: 15 })).toBe(false);
    expect(atalhoAtivo("rest_pause", { blocos: 2 }, { blocos: 2, pausaSeg: 15 })).toBe(true);
  });
});
