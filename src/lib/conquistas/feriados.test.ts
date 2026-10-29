import { describe, expect, it } from "vitest";
import { destaqueFeriado, feriadoDoDia, feriadosDoAno, pascoa, proximoFeriado, tituloFeriado, trofeusDeFeriado } from "./feriados";
import type { CardioFeito } from "@/lib/cardio/regras";

const sessao = (id: string, inicio: string) => ({ id, iniciado_em: inicio, status: "concluida", series_concluidas: 10, series_planejadas: 10, modo: "normal", conta_aderencia: true }) as never;
const cardio = (data: string, min: number): CardioFeito => ({ id: `c${data}`, origem: "app", modalidade: "cardio_esteira", status: "concluido", duracaoMin: min, planejadoMin: null, intensidadePlanejada: null, intensidade: null, esforco: null, data, realizadoEm: `${data}T15:00:00Z` }) as unknown as CardioFeito;

describe("calendário de feriados", () => {
  it("Páscoa e Carnaval certos", () => {
    expect(pascoa(2026)).toBe("2026-04-05");
    expect(pascoa(2027)).toBe("2027-03-28");
    expect(feriadosDoAno(2027).find((f) => f.slug === "carnaval")?.datas).toEqual(["2027-02-08", "2027-02-09"]);
  });
  it("Finados 2026 cai na segunda; destaque na véspera e no dia", () => {
    expect(feriadoDoDia("2026-11-02")?.nome).toBe("Finados");
    expect(destaqueFeriado("2026-11-01")).toMatchObject({ quando: "amanha", dia: "2026-11-02" });
    expect(destaqueFeriado("2026-11-02")).toMatchObject({ quando: "hoje" });
    expect(destaqueFeriado("2026-10-29")).toBeNull();
    expect(proximoFeriado("2026-10-29")?.dia).toBe("2026-11-02");
    expect(proximoFeriado("2026-12-26")?.feriado.slug).toBe("ano_novo");
  });
  it("nome do troféu leva o feriado", () => {
    expect(tituloFeriado("feriado_musculacao", "Natal")).toBe("Natal Pago");
    expect(tituloFeriado("feriado_cardio", "Carnaval")).toBe("Carnaval de Fôlego");
    expect(tituloFeriado("feriado_combo", "Ano Novo")).toBe("Ano Novo Completo");
  });
});

describe("trofeusDeFeriado", () => {
  it("musculação e cardio separados; os dois = +1 (Combo)", () => {
    const t = trofeusDeFeriado([sessao("s1", "2026-11-02T12:00:00Z")], [cardio("2026-11-02", 25)]);
    expect(t.map((x) => `${x.codigo}:${x.referencia}:${x.titulo}`).sort()).toEqual(["feriado_cardio:finados:2026:Finados de Fôlego", "feriado_combo:finados:2026:Finados Completo", "feriado_musculacao:finados:2026:Finados Pago"]);
  });
  it("dia comum não conta; Carnaval segunda + cardio na terça = combo", () => {
    expect(trofeusDeFeriado([sessao("s1", "2026-11-03T12:00:00Z")], [])).toEqual([]);
    const t = trofeusDeFeriado([sessao("s1", "2027-02-08T12:00:00Z")], [cardio("2027-02-09", 30)]);
    expect(t.map((x) => x.codigo).sort()).toEqual(["feriado_cardio", "feriado_combo", "feriado_musculacao"]);
  });
  it("cardio curto (menos de 10 min) não conta", () => {
    expect(trofeusDeFeriado([], [cardio("2026-12-25", 5)])).toEqual([]);
  });
});
