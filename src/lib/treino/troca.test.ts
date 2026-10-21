import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { itemDoCatalogo } from "@/lib/biblioteca/itens";
import type { Equivalencia } from "@/lib/biblioteca/tipos";
import { montagemLenta, montagemRapida, opcoesDeTroca } from "./troca";

const itens = CATALOGO.map((e) => itemDoCatalogo(e));
const porSlug = (s: string) => itens.find((i) => i.slug === s)!;
const curadas: Equivalencia[] = CATALOGO.flatMap((e) => e.substituicoes.map((s) => ({ exercicioId: `cat-${e.slug}`, alternativaId: `cat-${s}`, origem: "catalogo" as const, status: "sugerida" as const, nota: null })));

describe("troca de exercício pelo aluno", () => {
  it("só anilhas contam como montagem lenta; halter é rápido (e boa troca)", () => {
    expect(montagemLenta(porSlug("supino-reto-barra"))).toBe(true);
    expect(montagemLenta(porSlug("leg-press-45"))).toBe(true);
    expect(montagemLenta(porSlug("supino-reto-halteres"))).toBe(false);
    expect(montagemRapida(porSlug("supino-reto-halteres"))).toBe(true);
    expect(montagemRapida(porSlug("supino-reto-maquina"))).toBe(true);
    const rosca = itens.find((i) => /^rosca direta/i.test(i.nome) && i.equipamento.includes("barra"));
    if (rosca) expect(montagemLenta(rosca)).toBe(false);
    const agach = itens.find((i) => /^agachamento livre/i.test(i.nome));
    if (agach) expect(montagemLenta(agach)).toBe(true);
  });

  it("exercício de montagem lenta: máquina aparece primeiro", () => {
    const r = opcoesDeTroca(porSlug("supino-reto-barra"), itens, curadas);
    expect(r.lento).toBe(true);
    expect(r.opcoes[0].rapido).toBe(true);
    expect(r.opcoes.map((o) => o.id)).toContain("cat-supino-reto-maquina");
    expect(r.opcoes.every((o) => o.grupo === "peito")).toBe(true);
  });

  it("nunca sugere a troca que o personal rejeitou", () => {
    const rej: Equivalencia[] = [...curadas, { exercicioId: "cat-supino-reto-barra", alternativaId: "cat-supino-reto-maquina", origem: "treinador", status: "rejeitada", nota: null }];
    const r = opcoesDeTroca(porSlug("supino-reto-barra"), itens, rej.filter((e) => !(e.alternativaId === "cat-supino-reto-maquina" && e.status === "sugerida")));
    expect(r.opcoes.map((o) => o.id)).not.toContain("cat-supino-reto-maquina");
  });
});
