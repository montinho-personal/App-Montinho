import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { abaDoSexo, filtrarVitrine, marcaDoPronto, planoDoPronto, progressoDesafio, prontoDaMarca, prontosParecidos, prontosVisiveis, TREINOS_PRONTOS } from "./treinos-prontos";

const TODOS = CATALOGO.map((e) => e.slug);

describe("treinos prontos", () => {
  it("todo pronto gera um plano completo, dentro do tempo e dos dias", () => {
    for (const t of TREINOS_PRONTOS) {
      const plano = planoDoPronto(t, TODOS);
      expect(plano, t.slug).not.toBeNull();
      expect(plano!.treinos).toHaveLength(t.parametros.dias);
      for (const tr of plano!.treinos) expect(tr.minutos, `${t.slug} ${tr.letra}`).toBeLessThanOrEqual(t.parametros.minutos);
    }
  });
  it("slugs e nomes únicos; só aprovados aparecem fora da demonstração", () => {
    expect(new Set(TREINOS_PRONTOS.map((t) => t.slug)).size).toBe(TREINOS_PRONTOS.length);
    expect(new Set(TREINOS_PRONTOS.map((t) => t.nome)).size).toBe(TREINOS_PRONTOS.length);
    // Na demonstração aparecem todos, menos os de casa enquanto estiverem desligados.
    expect(prontosVisiveis(true)).toHaveLength(TREINOS_PRONTOS.filter((t) => t.parametros.local !== "casa").length);
    expect(prontosVisiveis(false).every((t) => t.aprovado)).toBe(true);
    expect(prontosVisiveis(true).some((t) => t.slug === "em-casa-sem-desculpa")).toBe(false);
  });
  it("marca nas observações identifica o pronto (desafio)", () => {
    const t = TREINOS_PRONTOS[0];
    expect(prontoDaMarca(marcaDoPronto(t))?.slug).toBe(t.slug);
    expect(prontoDaMarca("outra coisa")).toBeNull();
  });
  it("progresso do desafio: meta = dias/semana × semanas", () => {
    const t = { desafioDias: 21, parametros: { ...TREINOS_PRONTOS[0].parametros, dias: 3 } };
    const r = progressoDesafio(t, "2026-10-01", "2026-10-10", ["2026-09-30", "2026-10-01", "2026-10-03", "2026-10-06", "2026-10-25"]);
    expect(r).toEqual({ feitos: 3, meta: 9, diaAtual: 10, terminou: false, concluido: false });
    expect(progressoDesafio(t, "2026-10-01", "2026-10-30", []).terminou).toBe(true);
  });
  it("parecidos com o pedido", () => {
    const r = prontosParecidos({ nivel: "iniciante", dias: 3, minutos: 45, foco: "gluteo", local: "academia" }, TREINOS_PRONTOS);
    expect(r.map((t) => t.slug)).toEqual(["iniciante-feminino", "projeto-calca-apertada"]);
  });
});

describe("Musa da Bulgária e divisões por público", () => {
  const slugs = [...CATALOGO.map((c) => c.slug), "agachamento-bulgaro-smith"];
  it("dias de pernas começam no búlgaro no Smith e terminam no búlgaro com halteres", () => {
    const p = planoDoPronto(TREINOS_PRONTOS.find((t) => t.slug === "musa-da-bulgaria")!, slugs)!;
    const pernas = p.treinos.filter((t) => t.nome.startsWith("Pernas e glúteo"));
    expect(pernas).toHaveLength(2);
    for (const t of pernas) {
      expect(t.exercicios[0].slug).toBe("agachamento-bulgaro-smith");
      expect(t.exercicios.at(-1)!.slug).toBe("agachamento-bulgaro");
      expect(t.minutos).toBeLessThanOrEqual(60);
    }
  });
  it("sem o búlgaro no Smith na biblioteca, abre com o búlgaro comum", () => {
    const p = planoDoPronto(TREINOS_PRONTOS.find((t) => t.slug === "musa-da-bulgaria")!, CATALOGO.map((c) => c.slug))!;
    expect(p.treinos[0].exercicios[0].slug).toBe("agachamento-bulgaro");
  });
  it("iniciantes, masculino e feminino montam e cabem no tempo", () => {
    for (const slug of ["iniciante-masculino", "iniciante-feminino", "masculino-depois-do-comeco", "feminino-depois-do-comeco"]) {
      const t = TREINOS_PRONTOS.find((x) => x.slug === slug)!;
      expect(t.aprovado).toBe(true);
      const p = planoDoPronto(t, slugs)!;
      expect(p.treinos.length).toBe(t.parametros.dias);
      for (const tr of p.treinos) expect(tr.minutos).toBeLessThanOrEqual(t.parametros.minutos);
    }
  });
});

describe("vitrine por público e nível", () => {
  const slugs = CATALOGO.map((c) => c.slug);
  it("feminino mostra os femininos e os para todos; nunca os masculinos", () => {
    const f = filtrarVitrine(TREINOS_PRONTOS, "feminino", "todos").map((t) => t.slug);
    expect(f).toEqual(expect.arrayContaining(["rainha-do-agachamento", "musa-da-bulgaria", "iniciante-feminino", "em-casa-sem-desculpa"]));
    expect(f).not.toContain("rei-do-supino");
    const m = filtrarVitrine(TREINOS_PRONTOS, "masculino", "todos").map((t) => t.slug);
    expect(m).toEqual(expect.arrayContaining(["rei-do-supino", "iniciante-masculino", "em-casa-sem-desculpa"]));
    expect(m).not.toContain("musa-da-bulgaria");
    expect(filtrarVitrine(TREINOS_PRONTOS, "todos", "todos")).toHaveLength(TREINOS_PRONTOS.length);
  });
  it("filtro de nível", () => {
    const ini = filtrarVitrine(TREINOS_PRONTOS, "masculino", "iniciante");
    expect(ini.length).toBeGreaterThan(0);
    expect(ini.every((t) => t.parametros.nivel === "iniciante")).toBe(true);
  });
  it("aba inicial pelo sexo do cadastro", () => {
    expect([abaDoSexo("F"), abaDoSexo("M"), abaDoSexo(null), abaDoSexo("NI")]).toEqual(["feminino", "masculino", "todos", "todos"]);
  });
  it("feminino: descanso de até 90 s nos multiarticulares (mulheres se recuperam mais rápido)", () => {
    const fem = planoDoPronto(TREINOS_PRONTOS.find((t) => t.slug === "feminino-depois-do-comeco")!, slugs)!;
    const masc = planoDoPronto(TREINOS_PRONTOS.find((t) => t.slug === "masculino-depois-do-comeco")!, slugs)!;
    const multis = (p: typeof fem) => p.treinos.flatMap((t) => t.exercicios.filter((e) => e.multi));
    expect(multis(fem).every((e) => e.descansoSeg <= 90)).toBe(true);
    expect(multis(masc).some((e) => e.descansoSeg > 90)).toBe(true);
  });
});
