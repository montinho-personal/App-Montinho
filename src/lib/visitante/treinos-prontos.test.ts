import { describe, expect, it } from "vitest";
import { CATALOGO } from "@/lib/biblioteca/catalogo";
import { marcaDoPronto, planoDoPronto, progressoDesafio, prontoDaMarca, prontosParecidos, prontosVisiveis, TREINOS_PRONTOS } from "./treinos-prontos";

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
    expect(prontosVisiveis(true)).toHaveLength(TREINOS_PRONTOS.length);
    expect(prontosVisiveis(false).every((t) => t.aprovado)).toBe(true);
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
    expect(r.map((t) => t.slug)).toEqual(["projeto-calca-apertada", "operacao-musa-do-bumbum"]);
  });
});
