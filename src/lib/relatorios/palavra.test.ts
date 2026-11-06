import { describe, expect, it } from "vitest";
import { cargasParadas, destaqueDaCapa, duracaoTxt, lerPalavraSalva, palavraAutomatica, palavraFinal } from "./palavra";

const ponto = (data: string, carga: number) => ({ data, cargaMax: carga, e1rmMax: null, tonelagem: 0, series: 3, fonte: "app" as const });
const ex = (nome: string, cargas: Array<[string, number]>) => ({ chave: nome, nome, grupo: "x", grupoRotulo: "X", pontos: cargas.map(([d, c]) => ponto(d, c)), dias: cargas.length, inicial: { data: cargas[0][0], carga: cargas[0][1] }, atual: { data: cargas.at(-1)![0], carga: cargas.at(-1)![1] }, melhor: { data: "", carga: 0 }, deltaKg: 0, deltaPct: 0, e1rmInicial: null, e1rmAtual: null, e1rmDeltaPct: null }) as never;
const frontal = ex("Elevação frontal", [["2026-03-12", 8], ["2026-11-04", 16]]);
const leg = ex("Leg press 45°", [["2026-10-10", 100], ["2026-10-20", 120], ["2026-10-27", 120], ["2026-11-03", 120]]);
const base = { semDados: false, treinos: 96, semanas: 34, tonelagem: 212_000, marcos: Array(12).fill({}), exerciciosComparaveis: 10, exerciciosQueSubiram: 7, destaques: [frontal], exercicios: [frontal, leg], fim: "2026-11-06" } as never;

describe("Palavra do Montinho", () => {
  it("duração em meses ou semanas", () => {
    expect(duracaoTxt(34)).toBe("8 meses");
    expect(duracaoTxt(5)).toBe("5 semanas");
  });
  it("carga parada nos 3 últimos treinos", () => {
    expect(cargasParadas([frontal, leg], "2026-11-06")).toEqual([{ nome: "Leg press 45°", carga: 120, vezes: 3 }]);
    expect(cargasParadas([leg], "2027-01-30")).toEqual([]);
  });
  it("manchete da capa com o maior feito", () => {
    const c = destaqueDaCapa(base, 92)!;
    expect(c.titulo).toBe("12 marcas pessoais em 8 meses 🏆");
    expect(c.sub).toContain("dobrou: de 8 kg para 16 kg");
  });
  it("palavra automática com números reais", () => {
    const p = palavraAutomatica({ r: base, aderenciaPct: 92, ultimas4Pct: 75, metaSemanal: 4 });
    expect(p.continuar).toContain("constância foi de 92%");
    expect(p.continuar).toContain("de 8 kg para 16 kg");
    expect(p.atencao).toContain("Leg press 45° está há 3 treinos com 120 kg");
    expect(p.missao).toBe("Fazer os 4 treinos da semana em todas as próximas 4 semanas.");
    expect(p.frase).toBeNull();
  });
  it("sem dados: começo, sem números inventados", () => {
    const p = palavraAutomatica({ r: { ...(base as object), semDados: true, treinos: 0 } as never, aderenciaPct: null, ultimas4Pct: null, metaSemanal: null });
    expect(p.missao).toContain("Registrar todos os treinos");
  });
  it("o que o personal editou vale por 30 dias", () => {
    const auto = palavraAutomatica({ r: base, aderenciaPct: 92, ultimas4Pct: 100, metaSemanal: 4 });
    const salva = lerPalavraSalva([{ referencia: { palavra_relatorio: { frase: "Bora!", missao: "" } }, created_at: "2026-11-01T10:00:00Z" }]);
    const f = palavraFinal(auto, salva, "2026-11-06");
    expect(f.frase).toBe("Bora!");
    expect(f.missao).toBe(auto.missao);
    expect(palavraFinal(auto, salva, "2026-12-20").frase).toBeNull();
  });
});
