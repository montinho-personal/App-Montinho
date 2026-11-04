import { describe, expect, it } from "vitest";
import { evolucaoDaAvaliacao, focoDoObjetivo } from "./evolucao-avaliacao";
import type { Evolucao } from "@/lib/supabase/types";

const av = (id: string, data: string, peso: number, gordura: number, magra: number, soma: number, cintura: number): Evolucao =>
  ({ id, aluno_id: "x", data, created_at: `${data}T12:00:00Z`, peso_kg: peso, gordura_pct: gordura, massa_magra_kg: magra, cintura_cm: cintura, extras: [{ nome: "Soma das 7 dobras", valor: soma, unidade: "mm" }, { nome: "Massa gorda", valor: Math.round(peso * gordura) / 100, unidade: "kg" }], observacoes: "Avaliação de 7 dobras (Jackson & Pollock + Siri), mulher, 40 anos." }) as unknown as Evolucao;

// Os números das duas avaliações da Natália (abr. e out./2026).
const abr = av("a1", "2026-04-29", 59.9, 20.9, 47.4, 98, 65.5);
const out = av("a2", "2026-10-02", 57.4, 17.2, 47.5, 76, 62);

describe("evolução na avaliação física", () => {
  it("objetivo → foco", () => {
    expect(focoDoObjetivo("Hipertrofia")).toBe("crescer");
    expect(focoDoObjetivo("Emagrecimento")).toBe("emagrecer");
    expect(focoDoObjetivo("Perder gordura e ganhar massa")).toBe("geral");
    expect(focoDoObjetivo(null)).toBe("geral");
  });

  it("gordura caiu e massa magra mantida: evoluiu (Natália, hipertrofia)", () => {
    const e = evolucaoDaAvaliacao([abr, out], "Hipertrofia")!;
    expect(e.evoluiu).toBe(true);
    expect(e.manchete).toBe("Mais definição: seu % de gordura caiu!");
    expect(e.itens.map((i) => i.chave)).toEqual(["gordura", "massa_magra_mantida", "massa_gorda", "soma_dobras"]);
    expect(e.itens[0].texto).toBe("% de gordura caiu 3,7 pontos (20,9% → 17,2%)");
  });

  it("quem quer emagrecer vê a cintura; recomposição quando os dois melhoram", () => {
    const depois = av("a3", "2026-12-20", 57.4, 16, 48.5, 70, 61);
    const e = evolucaoDaAvaliacao([abr, out, depois], "Emagrecimento")!;
    expect(e.manchete).toMatch(/Recomposição/);
    expect(e.itens.map((i) => i.chave)).toContain("cintura");
    expect(evolucaoDaAvaliacao([abr, out, depois], "Hipertrofia")!.itens[0].chave).toBe("massa_magra");
  });

  it("sem melhora (ou só peso mudando) não comemora; 1ª avaliação não compara", () => {
    const igual = av("a3", "2026-12-20", 55, 17.4, 47.3, 77, 60);
    expect(evolucaoDaAvaliacao([out, igual], null)!.evoluiu).toBe(false);
    expect(evolucaoDaAvaliacao([out, igual], null)!.itens).toEqual([]);
    expect(evolucaoDaAvaliacao([abr], null)).toBeNull();
  });
});
