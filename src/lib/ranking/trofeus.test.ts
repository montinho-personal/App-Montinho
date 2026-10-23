import { describe, expect, it } from "vitest";
import { ORDEM } from "@/lib/conquistas/vitrine";
import { CATALOGO } from "@/lib/conquistas/regras";
import { FORA_DO_RANKING, fraseDoRanking, podioDaPosicao, proximoDegrau, type LinhaRanking } from "./trofeus";

const l = (posicao: number, nome: string, trofeus: number, eu = false): LinhaRanking => ({ posicao, nome, trofeus, eu, visitante: false });

describe("ranking de troféus", () => {
  it("ouro, prata e bronze nos 3 primeiros lugares", () => {
    expect([1, 2, 3, 4].map(podioDaPosicao)).toEqual(["ouro", "prata", "bronze", null]);
  });
  it("quanto falta para o lugar de cima (empate divide o lugar)", () => {
    const r = [l(1, "Ana S.", 20), l(2, "Bia R.", 15), l(2, "Caio M.", 15), l(3, "Eu E.", 11, true)];
    expect(proximoDegrau(r)).toEqual({ posicao: 2, faltam: 4 });
    expect(fraseDoRanking(r)).toBe("Você está no 3º lugar: bronze! Faltam 4 troféus para chegar ao 2º lugar.");
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
