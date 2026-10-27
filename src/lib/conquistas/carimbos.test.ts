import { describe, expect, it } from "vitest";
import { cartaoDeCarimbos, contarCarimbos } from "./carimbos";

const s = (extra: Record<string, unknown>) => ({ id: Math.random().toString(), iniciado_em: "2026-10-01T10:00:00-03:00", status: "concluida" as const, series_planejadas: 20, series_concluidas: 20, ...extra });

describe("carimbos", () => {
  it("1 carimbo por treino concluído; extra com séries conta; parcial, cancelado, cardio e importado não", () => {
    const n = contarCarimbos([
      s({}),
      s({ series_concluidas: 12 }),
      s({ series_concluidas: 5 }), // parcial
      s({ status: "abandonada", series_concluidas: 0 }), // cancelado
      s({ modo: "extra", series_planejadas: 0, series_concluidas: 8 }), // extra de musculação/livre
      s({ modo: "extra", series_planejadas: 0, series_concluidas: 0, duracao_seg: 1800 }), // extra de cardio
      s({ origem: "importado" }),
      s({ origem: "treinador" }), // aula presencial
    ]);
    expect(n).toBe(4);
  });
  it("cartões de 10 que nunca zeram", () => {
    expect(cartaoDeCarimbos(0)).toEqual({ noCartao: 0, cartoesCheios: 0, faltam: 10 });
    expect(cartaoDeCarimbos(23)).toEqual({ noCartao: 3, cartoesCheios: 2, faltam: 7 });
  });
});
