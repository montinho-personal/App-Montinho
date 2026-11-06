import { describe, expect, it } from "vitest";
import { noPeriodo, resumoSerie, seriesDeMedidas } from "./series-medidas";
import type { Evolucao } from "@/lib/supabase/types";

const reg = (id: string, data: string, campos: Partial<Evolucao>, extras: Array<{ nome: string; valor: number; unidade: string }> = []): Evolucao =>
  ({ id, aluno_id: "a", data, peso_kg: null, gordura_pct: null, cintura_cm: null, quadril_cm: null, braco_cm: null, coxa_cm: null, peito_cm: null, observacoes: null, created_at: `${data}T12:00:00Z`, extras, ...campos }) as Evolucao;

describe("linha do tempo de cada medida", () => {
  const ms = [
    reg("1", "2021-11-16", { peso_kg: 98.9, gordura_pct: 23.58, braco_cm: 39, altura_cm: 172 }, [{ nome: "Dobra abdominal", valor: 30, unidade: "mm" }, { nome: "Braço esquerdo", valor: 38, unidade: "cm" }, { nome: "Impedância 20 kHz", valor: 300, unidade: "Ω" }]),
    reg("2", "2026-02-14", { peso_kg: 81, gordura_pct: 8.44, braco_cm: 32.5, cintura_cm: 79.5 }, [{ nome: "Dobra abdominal", valor: 9, unidade: "mm" }, { nome: "Braço esquerdo", valor: 33.5, unidade: "cm" }]),
  ];
  it("junta campos e extras com 2+ datas, nos grupos certos", () => {
    const s = seriesDeMedidas(ms);
    const por = Object.fromEntries(s.map((x) => [x.rotulo, x]));
    expect(por["Peso"].pontos.map((p) => p.valor)).toEqual([98.9, 81]);
    expect(por["% de gordura"].grupo).toBe("corpo");
    expect(por["Braço direito"].grupo).toBe("circunferencias");
    expect(por["Braço esquerdo"].grupo).toBe("circunferencias");
    expect(por["Dobra abdominal"].grupo).toBe("dobras");
    expect(por["Cintura"]).toBeUndefined(); // só 1 data
    expect(por["Altura"]).toBeUndefined();
    expect(s.some((x) => x.rotulo.startsWith("Impedância"))).toBe(false);
  });
  it("resumo e período", () => {
    const peso = seriesDeMedidas(ms).find((x) => x.chave === "peso_kg")!;
    expect(resumoSerie(peso)).toMatchObject({ diferenca: -17.9, menor: 81, maior: 98.9 });
    expect(noPeriodo(peso, 365).length).toBe(1);
    expect(noPeriodo(peso, null).length).toBe(2);
  });
});
