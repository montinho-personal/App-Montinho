import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { comLocalPermitido, gerarOpcoes, minutosDoTreino, normalizarParametros, POOLS } from "./gerar-treino";

const TODOS = CATALOGO.map((e) => e.slug);

describe("gerador de treinos do visitante", () => {
  it("todo exercício dos grupos existe no catálogo do Montinho", () => {
    // O búlgaro no Smith foi cadastrado pelo personal (só no banco); sem ele, o gerador usa o búlgaro comum.
    const set = new Set([...TODOS, "agachamento-bulgaro-smith"]);
    for (const [chave, pool] of Object.entries(POOLS)) for (const s of [...pool.academia, ...pool.casa]) expect(set.has(s), `${chave}: ${s}`).toBe(true);
  });
  it("iniciante, 3 dias, 45 min: duas opções, 3 treinos cada, dentro do tempo", () => {
    const op = gerarOpcoes({ nivel: "iniciante", dias: 3, minutos: 45, foco: "geral" }, TODOS);
    expect(op.map((o) => o.id)).toEqual(["A", "B"]);
    for (const o of op) {
      expect(o.treinos).toHaveLength(3);
      for (const t of o.treinos) {
        expect(t.minutos).toBeLessThanOrEqual(45);
        expect(t.exercicios.length).toBeGreaterThanOrEqual(4);
        expect(new Set(t.exercicios.map((e) => e.slug)).size).toBe(t.exercicios.length); // sem repetir no dia
      }
    }
    // Corpo todo 3×: varia exercícios entre os dias (rodízio)
    const a = op[0].treinos;
    expect(a[0].exercicios[0].slug).not.toBe(a[1].exercicios[0].slug);
  });
  it("foco em glúteo: glúteo vem primeiro e tem mais volume", () => {
    const [a] = gerarOpcoes({ nivel: "intermediario", dias: 4, minutos: 60, foco: "gluteo" }, TODOS);
    const inferior = a.treinos.find((t) => t.exercicios.some((e) => e.grupo === "gluteo"))!;
    expect(inferior.exercicios[0].grupo).toBe("gluteo");
    const gluteo = a.seriesPorGrupo.find((g) => g.grupo === "gluteo")!.series;
    const peito = a.seriesPorGrupo.find((g) => g.grupo === "peito")!.series;
    expect(gluteo).toBeGreaterThan(peito);
  });
  it("em casa: só exercícios de casa; dias e tempo ficam nos limites", () => {
    const op = gerarOpcoes({ nivel: "iniciante", dias: 9, minutos: 10, local: "casa" }, TODOS);
    expect(normalizarParametros({ dias: 9, minutos: 10 })).toMatchObject({ dias: 6, minutos: 25 });
    const casa = new Set(Object.values(POOLS).flatMap((p) => p.casa));
    for (const o of op) for (const t of o.treinos) for (const e of t.exercicios) expect(casa.has(e.slug), e.slug).toBe(true);
  });
  it("biblioteca sem um exercício: usa o próximo da lista", () => {
    const sem = TODOS.filter((s) => s !== "leg-press-45");
    const [a] = gerarOpcoes({ nivel: "iniciante", dias: 2, minutos: 60 }, sem);
    expect(a.treinos.flatMap((t) => t.exercicios.map((e) => e.slug))).not.toContain("leg-press-45");
  });
  it("estimativa de minutos", () => {
    expect(minutosDoTreino([{ series: 3, descansoSeg: 60 }])).toBe(11);
  });
});

describe("treinos em casa desligados", () => {
  it("pedido em casa vira academia; academia fica igual", () => {
    expect(comLocalPermitido(normalizarParametros({ local: "casa" })).local).toBe("academia");
    expect(comLocalPermitido(normalizarParametros({ local: "academia", dias: 4 }))).toMatchObject({ local: "academia", dias: 4 });
  });
});
