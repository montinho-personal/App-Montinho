// Trilhas longas (04/11/2026, pedido do Montinho): o veterano continua ganhando troféu.
import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { CATALOGO, CODIGOS_TRILHAS, LENDARIAS, detectarConquistas, type SessaoConquista } from "./regras";
import { trofeusDeSeries } from "./volume-series";
import { trofeusDeTempo } from "./acompanhamento";
import { trofeusDeMonitoramento } from "./monitoramento";
import { DEGRAU_ANTERIOR } from "./vitrine";

let n = 0;
const somar = (base: string, dias: number) => new Date(Date.parse(`${base}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `s${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, exercicios: [], ...o });
const metas = [{ desde: "2024-01-01", meta: 3, origem: "personal" as const }];
function detectar(sessoes: SessaoConquista[], hoje: string) {
  const aderencia = calcularAderencia({ inicio: "2024-01-01", hoje, metas, sessoes });
  return detectarConquistas({ sessoes, aderencia }).map((x) => x.codigo);
}

describe("Trilhas longas", () => {
  // 3 treinos por semana (segunda, quarta e sexta), a partir de 01/01/2024 (segunda-feira).
  const semanas = (qtd: number) => Array.from({ length: qtd }, (_, w) => [0, 2, 4].map((d) => s(somar("2024-01-01", w * 7 + d)))).flat();

  it("treinos 75 e 100 saem no 75º e no 100º treino concluído", () => {
    const xs = semanas(34); // 102 treinos
    const c = detectar(xs, "2024-09-01");
    expect(c).toContain("treinos_75");
    expect(c).toContain("treinos_100");
    expect(c).not.toContain("treinos_150");
  });

  it("semanas seguidas: 16, 20 e 26 com a meta cumprida; 39 ainda não", () => {
    const c = detectar(semanas(27), "2024-07-15");
    for (const k of ["semanas_consistentes_12", "semanas_consistentes_16", "semanas_consistentes_20", "semanas_consistentes_26"]) expect(c).toContain(k);
    expect(c).not.toContain("semanas_consistentes_39");
  });

  it("um ano inteiro: 52 semanas seguidas e o Um Ano Inabalável é lendário", () => {
    const c = detectar(semanas(53), "2025-01-10");
    expect(c).toContain("semanas_consistentes_52");
    expect(LENDARIAS.has("semanas_consistentes_52")).toBe(true);
    expect(LENDARIAS.has("treinos_500")).toBe(true);
  });

  it("séries 2.000 e 5.000", () => {
    const xs = Array.from({ length: 260 }, (_, i) => ({ id: `v${i}`, iniciado_em: `${somar("2024-01-01", i)}T13:00:00Z`, status: "concluida" as const, series_planejadas: 20, series_concluidas: 20 }));
    expect(trofeusDeSeries(xs).map((t) => t.codigo)).toEqual(["series_500", "series_1000", "series_2000", "series_5000"]);
  });

  it("acompanhamento: 9 meses, 1 ano, 18 meses e 2 anos (meses com treino, não precisam ser seguidos)", () => {
    const xs = Array.from({ length: 24 }, (_, m) => s(somar("2024-01-05", m * 30)));
    expect(trofeusDeTempo(xs).filter((t) => t.codigo !== "retomada_30").map((t) => t.codigo)).toEqual(["acompanhamento_3_meses", "acompanhamento_6_meses", "acompanhamento_9_meses", "acompanhamento_1_ano", "acompanhamento_18_meses", "acompanhamento_2_anos"]);
  });

  it("monitoramento: 52 semanas seguidas", () => {
    const regs = Array.from({ length: 52 }, (_, w) => `${somar("2025-01-07", w * 7)}T15:00:00Z`);
    expect(trofeusDeMonitoramento(regs, "2026-01-30").map((t) => t.codigo)).toContain("monitoramento_52");
  });

  it("todo código novo tem regra escrita e um degrau anterior na vitrine", () => {
    for (const c of CODIGOS_TRILHAS) {
      expect(CATALOGO[c]?.titulo, c).toBeTruthy();
      expect(DEGRAU_ANTERIOR[c], c).toBeTruthy();
    }
  });
});
