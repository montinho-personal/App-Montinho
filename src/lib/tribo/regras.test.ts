import { describe, expect, it } from "vitest";
import {
  cardDaTribo,
  previsaoDoMarco,
  ultimosDiasDaTribo,
  concessoes,
  curiosidades,
  MARCOS_PADRAO,
  mensagensDaTribo,
  metaRecuperacao,
  proximoMarco,
  progressoMissao,
  resumoTribo,
  situacaoDosMarcos,
  type Contribuicao,
  type DadosTribo,
  type MarcoTribo,
  type MissaoTribo,
} from "./regras";

// Cardio: cada contribuição = minutos. `eu` = do aluno que está vendo.
let h = 0;
const c = (min: number, eu = false, dia = "2026-03-01"): Contribuicao => ({ t: "c", em: new Date(Date.parse(`${dia}T08:00:00-03:00`) + h++ * 60_000).toISOString(), min, mod: "esteira", eu, a: null });
const t = (eu = false, dia = "2026-03-01"): Contribuicao => ({ t: "t", em: new Date(Date.parse(`${dia}T08:00:00-03:00`) + h++ * 60_000).toISOString(), min: 0, mod: null, eu, a: null });
const dados = (contribuicoes: Contribuicao[], marcos: MarcoTribo[] = MARCOS_PADRAO, missoes: MissaoTribo[] = []): DadosTribo => ({ eu: "eu", treinador: false, contribuicoes, participantes: { cardio: 0, treinos: 0, total: 0 }, marcos, missoes });
const outros = (minutos: number, bloco = 600) => Array.from({ length: Math.ceil(minutos / bloco) }, (_, i) => c(Math.min(bloco, minutos - i * bloco)));

describe("regra dos 10% (definida, não muda)", () => {
  it("é 10% do marco, para cima, mínimo 1", () => {
    expect([1000, 5000, 10000, 15000, 25000, 50000, 100000].map(metaRecuperacao)).toEqual([100, 500, 1000, 1500, 2500, 5000, 10000]);
    expect(metaRecuperacao(100)).toBe(10);
    expect(metaRecuperacao(25)).toBe(3);
    expect(metaRecuperacao(5)).toBe(1);
  });
});

describe("participação coletiva", () => {
  it("1) presente desde o início: participa do 1º marco (faixa 0–1.000)", () => {
    const d = dados([c(30, true), ...outros(980)]);
    const g = concessoes(d, "2026-03-01");
    expect(g.map((x) => [x.codigo, x.metodo])).toEqual([["tribo_cardio_1000", "participacao"]]);
    expect(g[0].dados.contribuicao).toBe(30);
  });

  it("5) João entra com 12.000 na tribo, faz 30 min e participa do marco de 15.000", () => {
    const d = dados([...outros(12000), c(30, true), ...outros(3000)]);
    const s = situacaoDosMarcos(d, "cardio").find((x) => x.marco === 15000)!;
    expect(s.alcancadoEm).not.toBeNull();
    expect(s.participei).toBe(true);
    const g = concessoes(d, "2026-03-01");
    expect(g.find((x) => x.codigo === "tribo_cardio_15000")?.metodo).toBe("participacao");
  });

  it("contribuição que atravessa dois marcos vale para os dois", () => {
    const marcos: MarcoTribo[] = [{ trilha: "cardio", marco: 20, nome: "A" }, { trilha: "cardio", marco: 40, nome: "B" }];
    const d = dados([c(15), c(30, true)], marcos);
    expect(concessoes(d, "2026-03-01").map((x) => x.metodo)).toEqual(["participacao", "participacao"]);
  });

  it("marco não alcançado não dá troféu", () => {
    expect(concessoes(dados([c(500, true)]), "2026-03-01")).toEqual([]);
  });
});

describe("recuperação de troféus anteriores", () => {
  it("2/3/4) João entra com 15.000 já feitos; com 1.500 min recupera 1.000, 5.000, 10.000 e 15.000 de uma vez", () => {
    const base = outros(15000);
    const pouco = concessoes(dados([...base, ...Array.from({ length: 2 }, () => c(600, true))].slice(0)), "2026-03-01");
    // 1.200 min: recupera 1.000, 5.000 e 10.000 (metas 100/500/1.000), ainda não o de 15.000
    expect(pouco.filter((x) => x.metodo === "recuperacao").map((x) => x.referencia)).toEqual(["1000", "5000", "10000"]);
    const d = dados([...base, c(600, true), c(600, true), c(300, true)]);
    const g = concessoes(d, "2026-03-01");
    const recuperados = g.filter((x) => x.metodo === "recuperacao").map((x) => x.referencia);
    expect(recuperados).toEqual(["1000", "5000", "10000", "15000"]);
    // minutos não zeram: o acumulado é o mesmo em todos
    expect(g.filter((x) => x.metodo === "recuperacao").every((x) => x.dados.acumulado === 1500)).toBe(true);
  });

  it("depois de recuperar, participa do marco de 25.000 normalmente", () => {
    const d = dados([...outros(15000), c(600, true), c(600, true), c(300, true), ...outros(8500)]);
    const g = concessoes(d, "2026-03-01");
    expect(g.find((x) => x.codigo === "tribo_cardio_25000")?.metodo).toBe("participacao");
  });

  it("6) cada troféu sai uma vez só: quem participou não ganha de novo por recuperação", () => {
    const d = dados([c(200, true), ...outros(900)]);
    const g = concessoes(d, "2026-03-01").filter((x) => x.codigo === "tribo_cardio_1000");
    expect(g).toHaveLength(1);
    expect(g[0].metodo).toBe("participacao");
  });

  it("musculação: 10% para cima, mínimo 1 treino", () => {
    const antes = Array.from({ length: 100 }, () => t());
    const d = dados([...antes, ...Array.from({ length: 10 }, () => t(true))]);
    const g = concessoes(d, "2026-03-01").filter((x) => x.metodo === "recuperacao").map((x) => x.referencia);
    expect(g).toEqual(["10", "25", "50", "100"]);
    // 9 treinos: o de 100 ainda não
    const d9 = dados([...antes, ...Array.from({ length: 9 }, () => t(true))]);
    expect(concessoes(d9, "2026-03-01").some((x) => x.referencia === "100")).toBe(false);
  });
});

describe("totais e próximo marco", () => {
  it("14) sem nenhuma atividade: tudo zero, sem troféu e sem curiosidade", () => {
    const d = dados([]);
    expect(resumoTribo(d)).toMatchObject({ minutos: 0, sessoesCardio: 0, treinos: 0 });
    expect(proximoMarco(d, "cardio")).toMatchObject({ faltam: 1000, pct: 0 });
    expect(concessoes(d, "2026-03-01")).toEqual([]);
    expect(curiosidades(resumoTribo(d))).toEqual([]);
  });

  it("8) treinos de musculação somam na trilha de treinos", () => {
    const d = dados([t(true), t(), c(20)]);
    expect(resumoTribo(d)).toMatchObject({ treinos: 2, minutos: 20, sessoesCardio: 1, meus: { treinos: 1, minutos: 0 } });
    expect(proximoMarco(d, "treinos")).toMatchObject({ faltam: 8, total: 2 });
  });

  it("depois do último marco, não há próximo", () => {
    expect(proximoMarco(dados(outros(100000)), "cardio").marco).toBeNull();
  });
});

describe("missões coletivas", () => {
  const missao = (p: Partial<MissaoTribo> = {}): MissaoTribo => ({ id: "m1", nome: "Março em movimento", descricao: null, meta_minutos: 60, meta_treinos: null, inicio: "2026-03-01", fim: "2026-03-31", recorrente: false, ativa: true, participantes: 0, ...p });

  it("9) quem entra no meio da missão e contribui antes de concluir ganha o troféu", () => {
    const d = dados([c(40, false, "2026-03-02"), c(10, true, "2026-03-10"), c(30, false, "2026-03-12")], MARCOS_PADRAO, [missao()]);
    const p = progressoMissao(d.missoes[0], d.contribuicoes, "2026-03-15");
    expect(p.status).toBe("concluida");
    expect(p.ajudei).toBe(true);
    expect(p.meus.minutos).toBe(10);
    expect(concessoes(d, "2026-03-15").find((x) => x.codigo === "tribo_missao")?.referencia).toBe("m1");
  });

  it("contribuir depois de concluída não dá o troféu; fora do período não conta", () => {
    const d = dados([c(70, false, "2026-03-02"), c(10, true, "2026-03-20"), c(500, true, "2026-04-01")], MARCOS_PADRAO, [missao()]);
    const p = progressoMissao(d.missoes[0], d.contribuicoes, "2026-04-02");
    expect(p.minutos).toBe(80);
    expect(p.ajudei).toBe(false);
  });

  it("combinada só fecha com as duas metas; desativada não conclui", () => {
    const m = missao({ meta_treinos: 2 });
    const d = dados([c(60, true, "2026-03-02"), t(false, "2026-03-03")], MARCOS_PADRAO, [m]);
    expect(progressoMissao(m, d.contribuicoes, "2026-03-04")).toMatchObject({ tipo: "combinada", status: "ativa", pct: 50 });
    const d2 = dados([...d.contribuicoes, t(false, "2026-03-05")], MARCOS_PADRAO, [m]);
    expect(progressoMissao(m, d2.contribuicoes, "2026-03-06").status).toBe("concluida");
    expect(progressoMissao({ ...m, ativa: false }, d2.contribuicoes, "2026-03-06").status).toBe("desativada");
  });

  it("missão que terminou sem bater a meta fica como encerrada (histórico)", () => {
    expect(progressoMissao(missao(), [c(20, true, "2026-03-02")], "2026-04-05").status).toBe("encerrada");
  });
});

describe("curiosidades e mensagens", () => {
  it("240 horas = 10 dias inteiros; caminhada a 5 km/h é equivalência ilustrativa", () => {
    const cs = curiosidades({ minutos: 14400, sessoesCardio: 600, treinos: 0, participantes: 10 }, [c(14400)]);
    expect(cs.find((x) => x.id === "tempo")?.texto).toContain("240 horas");
    expect(cs.find((x) => x.id === "tempo")?.texto).toContain("10 dias inteiros");
    expect(cs.find((x) => x.id === "distancia")?.texto).toContain("1.200 km");
    expect(cs.find((x) => x.id === "distancia")?.nota).toMatch(/ilustrativa/);
    expect(cs.find((x) => x.id === "sessoes")?.texto).toContain("600 sessões de cardio de 24 minutos");
    const energia = cs.find((x) => x.id === "energia")!;
    expect(energia.nota).toMatch(/Estimativa/);
    // nunca promete emagrecimento em quilos
    expect(cs.map((x) => `${x.titulo} ${x.texto}`).join(" ")).not.toMatch(/kg de gordura|emagrec|perdeu/i);
  });

  it("mensagens positivas, sem culpa", () => {
    const d = dados([c(25, true, "2026-03-01"), ...outros(600)]);
    const m = mensagensDaTribo(d, "2026-03-01", true);
    expect(m).toContain("Você adicionou 25 minutos à Tribo Montinho hoje!");
    expect(m).toContain("Você recuperou uma conquista histórica da tribo!");
    expect(m.some((x) => x.startsWith("Faltam apenas 375 minutos"))).toBe(true);
    expect(m.join(" ")).not.toMatch(/culpa|devia|precisa treinar mais|vergonha/i);
  });
});

describe("11) card para compartilhar", () => {
  it("nome, meta coletiva, contribuição pessoal e Jornada do Chalalá", () => {
    const card = cardDaTribo({ id: "x", codigo: "tribo_cardio_15000", referencia: "15000", metodo: "participacao", conquistado_em: "2026-03-01T12:00:00Z", dados: { trilha: "cardio", marco: 15000, nome: "Tribo Incansável", contribuicao: 30 } }, "João Silva");
    expect(card.titulo).toBe("TRIBO INCANSÁVEL");
    expect(card.destaque).toBe("Juntos, alcançamos 15.000 minutos de cardio!");
    expect(card.frase).toBe("Eu fiz parte dessa conquista!");
    expect(card.porque).toContain("30 minutos");
    expect(card.porque).toContain("Jornada do Chalalá");
    expect(card.nome).toBe("João");
    expect(card.legenda).toMatch(/^CONQUISTA DESBLOQUEADA!/);
  });

  it("os dois maiores marcos têm visual lendário", () => {
    expect(cardDaTribo({ id: "x", codigo: "tribo_cardio_100000", referencia: "100000", metodo: "recuperacao", conquistado_em: "2026-03-01T12:00:00Z", dados: { trilha: "cardio", marco: 100000, meta: 10000, acumulado: 10000 } }, "Ana").lendaria).toBe(true);
    expect(cardDaTribo({ id: "x", codigo: "tribo_cardio_1000", referencia: "1000", metodo: "participacao", conquistado_em: "2026-03-01T12:00:00Z", dados: {} }, "Ana").lendaria).toBe(false);
  });
});

describe("meta da tribo em gráfico", () => {
  const c = (em: string, min: number, eu = false): Contribuicao => ({ t: "c", em, min, mod: null, eu, a: null });
  it("soma por dia (Brasília), com a parte da pessoa", () => {
    const d = ultimosDiasDaTribo([c("2026-10-29T12:00:00Z", 30, true), c("2026-10-29T13:00:00Z", 20), c("2026-10-30T01:00:00Z", 15), c("2026-10-20T12:00:00Z", 99)], "cardio", "2026-10-29", 3);
    expect(d).toEqual([
      { dia: "2026-10-27", total: 0, meu: 0 },
      { dia: "2026-10-28", total: 0, meu: 0 },
      { dia: "2026-10-29", total: 65, meu: 30 },
    ]);
  });
  it("previsão pelo ritmo", () => {
    const ult = [{ dia: "a", total: 70, meu: 0 }, { dia: "b", total: 70, meu: 0 }];
    expect(previsaoDoMarco({ marco: { trilha: "cardio", marco: 1000, nome: "x" }, faltam: 700 }, ult)).toBe(10);
    expect(previsaoDoMarco({ marco: null, faltam: 0 }, ult)).toBeNull();
    expect(previsaoDoMarco({ marco: { trilha: "cardio", marco: 1000, nome: "x" }, faltam: 10 }, [{ dia: "a", total: 0, meu: 0 }])).toBeNull();
  });
});
