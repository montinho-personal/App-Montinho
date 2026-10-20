import { describe, expect, it } from "vitest";
import { calcularAderencia, classificarSessao, dataLocal, inicioDaSemana, metaDaSemana, tendencia, type SessaoAderencia } from "./calcular";

// Semanas de outubro/2026: segundas 05, 12, 19. "hoje" = quarta 21/10.
let n = 0;
const sessao = (dia: string, extra: Partial<SessaoAderencia> = {}): SessaoAderencia => ({
  id: `s${++n}`,
  iniciado_em: `${dia}T13:00:00.000Z`, // 10h no Brasil
  status: "concluida",
  modo: "normal",
  series_planejadas: 20,
  series_concluidas: 20,
  ...extra,
});
const base = { inicio: "2026-10-05", hoje: "2026-10-21" };
const meta = (m: number, desde = "2026-10-01") => [{ desde, meta: m, origem: "personal" as const }];

describe("aderência semanal", () => {
  it("meta 3, conclui 2 na semana: 67% e semana parcial", () => {
    const r = calcularAderencia({ ...base, metas: meta(3), sessoes: [sessao("2026-10-13"), sessao("2026-10-15")] });
    const s = r.semanas.find((x) => x.inicio === "2026-10-12")!;
    expect(s.pontos).toBe(2);
    expect(s.status).toBe("parcial");
  });

  it("meta 4, conclui 4: semana cumprida e 100%", () => {
    const r = calcularAderencia({ ...base, metas: meta(4), sessoes: ["2026-10-12", "2026-10-13", "2026-10-15", "2026-10-17"].map((d) => sessao(d)) });
    expect(r.semanas.find((x) => x.inicio === "2026-10-12")!.status).toBe("cumprida");
  });

  it("treino extra não infla a aderência; treinar além da meta também não", () => {
    const r = calcularAderencia({
      ...base,
      metas: meta(2),
      sessoes: [sessao("2026-10-12"), sessao("2026-10-13"), sessao("2026-10-14"), sessao("2026-10-15", { modo: "extra" })],
    });
    const s = r.semanas.find((x) => x.inicio === "2026-10-12")!;
    expect(s.pontos).toBe(2);
    expect(s.extras).toBe(1);
    expect(r.indices.d28.pct).toBeLessThanOrEqual(100);
  });

  it("pausa programada tira a semana do cálculo e não quebra a sequência", () => {
    const r = calcularAderencia({
      ...base,
      metas: meta(2),
      pausas: [{ inicio: "2026-10-12", fim: "2026-10-18", tipo: "ferias" }],
      sessoes: [sessao("2026-10-05"), sessao("2026-10-06"), sessao("2026-10-19"), sessao("2026-10-20")],
    });
    expect(r.semanas.find((x) => x.inicio === "2026-10-12")!.status).toBe("pausada");
    expect(r.indices.total.pct).toBe(100);
    expect(r.sequencia.atual).toBe(2);
    expect(r.dias["2026-10-14"].tipos).toEqual(["pausa"]);
  });

  it("semana sem prescrição não vira falha nem divisão por zero", () => {
    const r = calcularAderencia({ ...base, metas: [{ desde: "2026-10-12", meta: 3, origem: "programa" }], sessoes: [] });
    expect(r.semanas[0].status).toBe("sem_prescricao");
    expect(r.semanas[1].status).toBe("sem_treino");
    expect(calcularAderencia({ ...base, metas: [], sessoes: [] }).indices.total.pct).toBeNull();
  });

  it("sessão remanejada (feita em dia de descanso do calendário) conta e aparece como remanejada", () => {
    const cal = { modo: "fixa" as const, dias: [{ dia: 1, letra: "A" }, { dia: 3, letra: "B" }, { dia: 5, letra: "C" }, { dia: 2, letra: null }] };
    const r = calcularAderencia({ ...base, metas: meta(3), calendarios: [{ desde: "2026-10-01", calendario: cal }], sessoes: [sessao("2026-10-12"), sessao("2026-10-13"), sessao("2026-10-16")] });
    expect(r.dias["2026-10-13"].tipos).toEqual(["remanejado"]);
    expect(r.semanas.find((x) => x.inicio === "2026-10-12")!.pontos).toBe(3);
    expect(r.dias["2026-10-20"].tipos).toEqual(["descanso_planejado"]);
  });

  it("alteração de programa no meio da semana vale a partir da semana seguinte", () => {
    const metas = [
      { desde: "2026-10-01", meta: 3, origem: "programa" as const },
      { desde: "2026-10-14", meta: 5, origem: "programa" as const },
    ];
    expect(metaDaSemana(metas, "2026-10-12")).toBe(3);
    expect(metaDaSemana(metas, "2026-10-19")).toBe(5);
    // meta do personal vale sobre a do programa
    expect(metaDaSemana([...metas, { desde: "2026-10-01", meta: 4, origem: "personal" }], "2026-10-19")).toBe(4);
  });

  it("sessão duplicada (mesmo id repetido) conta uma vez; finalizada sem séries não conta", () => {
    const s = sessao("2026-10-13");
    const r = calcularAderencia({ ...base, metas: meta(3), sessoes: [s, s, { ...s }, sessao("2026-10-14", { series_concluidas: 0 })] });
    expect(r.semanas.find((x) => x.inicio === "2026-10-12")!.pontos).toBe(1);
  });

  it("sessão parcial vale meio ponto; em andamento não conta", () => {
    expect(classificarSessao(sessao("2026-10-13", { series_concluidas: 5 }))).toBe("parcial");
    expect(classificarSessao(sessao("2026-10-13", { status: "abandonada", series_concluidas: 12 }))).toBe("parcial");
    expect(classificarSessao(sessao("2026-10-13", { status: "em_andamento" }))).toBe("em_andamento");
    const r = calcularAderencia({ ...base, metas: meta(2), sessoes: [sessao("2026-10-13"), sessao("2026-10-14", { series_concluidas: 4 })] });
    expect(r.semanas.find((x) => x.inicio === "2026-10-12")!.pontos).toBe(1.5);
  });

  it("semana atual em andamento não conta como abaixo; cumprida já entra na sequência", () => {
    const r = calcularAderencia({ ...base, metas: meta(2), sessoes: [sessao("2026-10-19")] });
    expect(r.semanaAtual!.status).toBe("em_andamento");
    expect(r.indices.semanaAtual.pontos).toBe(1);
    const r2 = calcularAderencia({ ...base, metas: meta(1), sessoes: [sessao("2026-10-12"), sessao("2026-10-19")] });
    expect(r2.sequencia.atual).toBe(2);
    expect(r2.sequencia.melhor).toBe(2);
  });

  it("sequência: melhor histórica é preservada após semana abaixo da meta", () => {
    const r = calcularAderencia({ inicio: "2026-09-14", hoje: "2026-10-21", metas: meta(1, "2026-09-01"), sessoes: ["2026-09-14", "2026-09-21", "2026-09-28", "2026-10-12"].map((d) => sessao(d)) });
    expect(r.sequencia.melhor).toBe(3);
    expect(r.sequencia.atual).toBe(1);
    expect(r.sequencia.semanasCumpridas).toBe(4);
    expect(tendencia(r)).not.toBeNull();
  });

  it("datas no fuso do Brasil: 23h de domingo ainda é domingo", () => {
    expect(dataLocal("2026-10-19T02:30:00.000Z")).toBe("2026-10-18");
    expect(inicioDaSemana("2026-10-18")).toBe("2026-10-12");
    expect(inicioDaSemana("2026-10-19")).toBe("2026-10-19");
  });
});
