import { describe, expect, it } from "vitest";
import { compararMeses, diferenca, TEXTO_LIMITE } from "./evolucao";

const s = (iniciado_em: string, series: Array<[string, number, number]>, status = "concluida") => ({ iniciado_em, status, duracao_seg: 3000, exercicios: [{ series: series.map(([tipo, carga_kg, reps]) => ({ tipo, carga_kg, reps })) }] });

describe("evolução do visitante: este mês × mês passado", () => {
  it("separa os meses no horário de Brasília e ignora aquecimento e treino em andamento", () => {
    const r = compararMeses(
      [
        s("2026-10-05T12:00:00Z", [["valida", 40, 10], ["aquecimento", 20, 10]]),
        s("2026-11-01T02:00:00Z", [["valida", 50, 8]]), // 31/10 23h em Brasília
        s("2026-09-20T12:00:00Z", [["valida", 30, 10]]),
        s("2026-10-10T12:00:00Z", [["valida", 99, 9]], "em_andamento"),
      ],
      new Date("2026-10-22T15:00:00Z")
    );
    expect(r.rotuloAtual).toBe("outubro");
    expect(r.rotuloAnterior).toBe("setembro");
    expect(r.atual).toEqual({ treinos: 2, series: 2, cargaTotalKg: 800, minutos: 100 });
    expect(r.anterior.treinos).toBe(1);
  });
  it("janeiro compara com dezembro do ano anterior", () => {
    expect(compararMeses([], new Date("2027-01-10T12:00:00Z")).rotuloAnterior).toBe("dezembro");
  });
  it("diferença neutra e texto de limite", () => {
    expect(diferenca(5, 3)).toBe("+2");
    expect(diferenca(1, 3)).toBe("−2");
    expect(diferenca(2, 2)).toBe("igual");
    expect(TEXTO_LIMITE).toMatch(/não dá para medir só pela carga/);
  });
});
