import { describe, expect, it } from "vitest";
import type { CardioFeito } from "@/lib/cardio/regras";
import { CODIGOS_MINUTOS_CARDIO, minutosDeCardio, trofeusMinutosCardio } from "./cardio-minutos";

const c = (id: string, dia: string, min: number, extra: Partial<CardioFeito> = {}): CardioFeito =>
  ({ id, origem: "app", modalidade: "esteira", status: "concluido", duracaoMin: min, planejadoMin: null, intensidadePlanejada: null, intensidade: null, esforco: null, data: dia, realizadoEm: `${dia}T12:00:00Z`, prescricaoId: null, sessionId: null, distanciaKm: null, ...extra }) as CardioFeito;

describe("Minutos de Fôlego", () => {
  it("soma só cardio de 10+ min e feito", () => {
    expect(minutosDeCardio([c("a", "2026-11-01", 30), c("b", "2026-11-02", 8), c("d", "2026-11-03", 40, { status: "nao_realizado" })])).toBe(30);
  });
  it("cada marco sai uma vez, na atividade que passou dele", () => {
    const feitos = Array.from({ length: 11 }, (_, i) => c(`x${i}`, `2026-10-${String(i + 10).padStart(2, "0")}`, 100));
    const t = trofeusMinutosCardio(feitos);
    expect(t.map((x) => x.codigo)).toEqual(["minutos_cardio_300", "minutos_cardio_1000"]);
    expect(t[0].evidencia.cardio).toBe("x2");
    expect(t[1].evidencia.cardio).toBe("x9");
  });
  it("6 degraus, do 300 ao 30.000", () => {
    expect(CODIGOS_MINUTOS_CARDIO).toEqual(["minutos_cardio_300", "minutos_cardio_1000", "minutos_cardio_3000", "minutos_cardio_6000", "minutos_cardio_15000", "minutos_cardio_30000"]);
  });
});
