import { describe, expect, it } from "vitest";
import { ORDEM } from "@/lib/conquistas/vitrine";
import { CATALOGO } from "@/lib/conquistas/regras";
import { desempateDaAderencia, FORA_DO_RANKING, fraseDoRanking, podioDaPosicao, proximoDegrau, type LinhaRanking } from "./trofeus";

const l = (posicao: number, nome: string, trofeus: number, eu = false): LinhaRanking => ({ posicao, nome, trofeus, eu, visitante: false });

describe("ranking de troféus", () => {
  it("ouro, prata e bronze nos 3 primeiros lugares", () => {
    expect([1, 2, 3, 4].map(podioDaPosicao)).toEqual(["ouro", "prata", "bronze", null]);
  });
  it("quanto falta para o lugar de cima (empate divide o lugar)", () => {
    const r = [l(1, "Ana S.", 20), l(2, "Bia R.", 15), l(2, "Caio M.", 15), l(3, "Eu E.", 11, true)];
    expect(proximoDegrau(r)).toEqual({ posicao: 2, faltam: 4 });
    // Com o desempate, a posição pode pular (rank): o de cima é o mais próximo acima.
    expect(proximoDegrau([l(1, "Ana S.", 20), l(2, "Bia R.", 15), l(2, "Caio M.", 15), l(4, "Eu E.", 11, true)])).toEqual({ posicao: 2, faltam: 4 });
    expect(fraseDoRanking(r)).toBe("Você está no 3º lugar: bronze! Faltam 4 troféus para chegar ao 2º lugar.");
  });
  it("mesmos troféus de quem está acima: o recado fala do desempate", () => {
    const r = [l(1, "Ana S.", 9), l(2, "Eu E.", 9, true)];
    expect(proximoDegrau(r)).toEqual({ posicao: 1, faltam: 0 });
    expect(fraseDoRanking(r)).toMatch(/mesmos troféus.*meta desta semana/);
  });
  it("no topo e fora do ranking", () => {
    expect(fraseDoRanking([l(1, "Eu E.", 9, true)])).toMatch(/topo/);
    expect(fraseDoRanking([l(1, "Ana S.", 9)])).toMatch(/primeiro troféu/);
  });
});

describe("ranking conta os mesmos troféus da sala de troféus", () => {
  it("toda conquista fora da lista de exceções aparece na vitrine (e vice-versa)", () => {
    const naVitrine = new Set(ORDEM.map((o) => o.codigo as string));
    const fora = new Set<string>(FORA_DO_RANKING);
    for (const codigo of Object.keys(CATALOGO)) expect(naVitrine.has(codigo) !== fora.has(codigo), codigo).toBe(true);
  });
});

describe("desempate pela constância", () => {
  const sem = (inicio: string, meta: number | null, pontos: number, extra: Partial<{ atual: boolean; pausada: boolean }> = {}) => ({ inicio, meta, pontos, concluidas: 0, parciais: 0, extras: 0, pausada: false, atual: false, status: "parcial" as const, ...extra });
  const base = { sequencia: { atual: 3, melhor: 5, semanasParticipando: 8, semanasCumpridas: 6 }, indices: { semanaAtual: { pct: 0, pontos: 0, meta: 4, semanas: 1 }, d28: { pct: 81, pontos: 13, meta: 16, semanas: 4 }, s12: { pct: 0, pontos: 0, meta: 0, semanas: 0 }, total: { pct: 0, pontos: 0, meta: 0, semanas: 0 } } };
  it("usa a última semana FECHADA (não a atual) e a meta dela: 3 de 4 = 75%", () => {
    const d = desempateDaAderencia({ ...base, semanas: [sem("2026-10-05", 4, 4), sem("2026-10-12", 4, 3), sem("2026-10-19", 4, 0, { atual: true })] });
    expect(d).toEqual({ pctSemana: 75, semanaInicio: "2026-10-12", semanasSeguidas: 3, pct4Semanas: 81 });
  });
  it("semana de pausa não conta (usa a anterior); treino parcial vale meio", () => {
    const d = desempateDaAderencia({ ...base, semanas: [sem("2026-10-05", 3, 2.5), sem("2026-10-12", 3, 0, { pausada: true }), sem("2026-10-19", 3, 1, { atual: true })] });
    expect(d.pctSemana).toBe(83);
    expect(d.semanaInicio).toBe("2026-10-05");
  });
  it("sem semana fechada com meta: sem número (fica atrás no desempate)", () => {
    expect(desempateDaAderencia({ ...base, semanas: [sem("2026-10-19", 4, 2, { atual: true })] }).pctSemana).toBeNull();
  });
});

describe("ranking sem a linha do personal (Meu treino)", () => {
  const l = (posicao: number, nome: string, trofeus: number, eu = false) => ({ posicao, nome, trofeus, eu, visitante: false });
  it("quem estava atrás sobe uma posição", async () => {
    const { semMinhaLinha } = await import("./trofeus");
    const r = semMinhaLinha([l(1, "Ana", 9), l(2, "Montinho", 8, true), l(3, "Bia", 7), l(3, "Caio", 7)]);
    expect(r.map((x) => [x.nome, x.posicao])).toEqual([["Ana", 1], ["Bia", 2], ["Caio", 2]]);
    expect(r[2].mesmoTotalAcima).toBe(true);
  });
  it("empatado com outro: ninguém muda de posição", async () => {
    const { semMinhaLinha } = await import("./trofeus");
    const r = semMinhaLinha([l(1, "Ana", 9), l(1, "Montinho", 9, true), l(3, "Bia", 7)]);
    expect(r.map((x) => x.posicao)).toEqual([1, 3]);
  });
});
