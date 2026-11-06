import { describe, expect, it } from "vitest";
import { avaliacaoEmDestaque, metodoDa, parteDoNome, resumoDaAvaliacao } from "./resumo-avaliacao";
import type { Evolucao } from "@/lib/supabase/types";

const base = (o: Partial<Evolucao>): Evolucao => ({ id: "x", aluno_id: "a", data: "2026-10-09", peso_kg: null, gordura_pct: null, cintura_cm: null, quadril_cm: null, braco_cm: null, coxa_cm: null, peito_cm: null, observacoes: null, created_at: "2026-11-06T10:00:00Z", ...o });
const ex = (nome: string, valor: number, unidade: string) => ({ nome, valor, unidade });

// Laudo InBody como o da Michelle (nomes vindos da leitura do arquivo).
const inbody = base({
  id: "b1", origem: "personal", peso_kg: 66.8, altura_cm: 167, gordura_pct: 37.5, massa_muscular_kg: 22.9, massa_magra_kg: 41.7, gordura_visceral: 12,
  extras: [
    ex("Água Corporal Total", 30.5, "L"), ex("Proteína", 8.3, "kg"), ex("Minerais", 3, "kg"), ex("Massa de Gordura", 25.1, "kg"), ex("IMC", 24, "kg/m²"),
    ex("Pontuação InBody", 65, "pontos"), ex("Taxa Metabólica Basal", 1271, "kcal"), ex("Relação Cintura-Quadril", 0.89, ""),
    ex("Massa Magra Segmentar Braço Esquerdo", 2.04, "kg"), ex("Massa Magra Segmentar Braço Direito", 2.06, "kg"), ex("Massa Magra Segmentar Tronco", 19.4, "kg"),
    ex("Massa Magra Segmentar Perna Esquerda", 6.83, "kg"), ex("Massa Magra Segmentar Perna Direita", 6.88, "kg"),
    ex("Gordura Segmentar Braço Esquerdo", 1.8, "kg"), ex("Gordura Segmentar Tronco", 12.7, "kg"), ex("Gordura Segmentar Perna Direita", 3.8, "kg"),
    ex("Impedância 20 kHz BD", 456.9, "Ω"), ex("Impedância 100 kHz TR", 29.5, "Ω"),
  ],
});

describe("resumo de qualquer avaliação física", () => {
  it("bioimpedância InBody: números principais, segmentos, o resto e as impedâncias", () => {
    const r = resumoDaAvaliacao([inbody], "b1")!;
    expect(r.metodo).toBe("bioimpedancia");
    expect(r.principais.map((l) => l.rotulo)).toEqual(["Peso", "% de gordura", "Massa muscular", "Massa magra", "Massa de gordura", "Gordura visceral", "IMC", "Água corporal", "Taxa metabólica basal", "Relação cintura-quadril"]);
    expect(r.principais.find((l) => l.rotulo === "Água corporal")).toMatchObject({ atual: 30.5, unidade: "L" });
    expect(r.segmentos.map((s) => [s.parte, s.magra, s.gordura])).toEqual([["braco_e", 2.04, 1.8], ["braco_d", 2.06, null], ["tronco", 19.4, 12.7], ["perna_e", 6.83, null], ["perna_d", 6.88, 3.8]]);
    expect(r.outros.map((e) => e.nome)).toEqual(["Proteína", "Minerais", "Pontuação InBody"]);
    expect(r.tecnicos).toHaveLength(2);
    expect(r.anterior).toBeNull();
    expect(r.personal).toBe(true);
  });
  it("compara só com a anterior do MESMO método; fita compara com o último que tem a medida", () => {
    const antiga = base({ id: "b0", data: "2026-07-01", peso_kg: 70, gordura_pct: 40, gordura_visceral: 13, cintura_cm: 90 });
    const casa = base({ id: "c1", data: "2026-08-01", peso_kg: 68, cintura_cm: 88 });
    const r = resumoDaAvaliacao([antiga, casa, { ...inbody, cintura_cm: 85 }], "b1")!;
    expect(r.anterior).toEqual({ id: "b0", data: "2026-07-01" });
    expect(r.principais.find((l) => l.rotulo === "Peso")).toMatchObject({ anterior: 70, diferenca: -3.2 });
    expect(r.circunferencias[0]).toMatchObject({ rotulo: "Cintura", atual: 85, anterior: 88 });
  });
  it("método, destaque e partes do corpo", () => {
    expect(metodoDa(base({ peso_kg: 70, cintura_cm: 80 }))).toBe("medidas");
    expect(metodoDa(base({ extras: [ex("Soma das 7 dobras", 120, "mm")] }))).toBe("7_dobras");
    const casa = base({ id: "c2", data: "2026-11-01", peso_kg: 66 });
    expect(avaliacaoEmDestaque([inbody, casa])?.id).toBe("b1");
    expect(avaliacaoEmDestaque([casa])?.id).toBe("c2");
    expect(parteDoNome("Gordura Segmentar Perna Esquerda")).toBe("perna_e");
    expect(parteDoNome("Massa magra do braço direito")).toBe("braco_d");
    expect(parteDoNome("Tronco")).toBe("tronco");
  });
});
