import { describe, expect, it } from "vitest";
import { trofeusDoDiaDuplo } from "./dia-duplo";
import type { CardioFeito } from "@/lib/cardio/regras";

const sessao = (id: string, iniciado_em: string, extra: Record<string, unknown> = {}) => ({ id, iniciado_em, status: "concluida" as const, series_planejadas: 10, series_concluidas: 10, ...extra });
const cardio = (id: string, data: string, hora: string, duracaoMin: number, extra: Partial<CardioFeito> = {}): CardioFeito =>
  ({ id, origem: "registro", modalidade: "esteira", status: "concluido", duracaoMin, planejadoMin: null, intensidadePlanejada: null, intensidade: null, esforco: null, data, realizadoEm: `${data}T${hora}:00-03:00`, prescricaoId: null, sessionId: null, distanciaKm: null, fcMedia: null, ...extra }) as CardioFeito;
const codigos = (xs: { codigo: string }[]) => xs.map((x) => x.codigo).sort();

describe("troféus do dia em dobro", () => {
  it("Dose Dupla: 2 musculações no mesmo dia (Brasília); dias diferentes não contam", () => {
    expect(codigos(trofeusDoDiaDuplo([sessao("a", "2026-10-27T10:00:00Z"), sessao("b", "2026-10-28T10:00:00Z")], []))).toEqual([]);
    const t = trofeusDoDiaDuplo([sessao("a", "2026-10-28T10:00:00Z"), sessao("b", "2026-10-28T21:00:00Z")], []);
    expect(codigos(t)).toEqual(["dose_dupla"]);
    expect(t[0].sessaoId).toBe("b");
  });
  it("Dose Dupla: cancelado, parcial e importado não contam; extra com séries conta", () => {
    expect(trofeusDoDiaDuplo([sessao("a", "2026-10-28T10:00:00Z"), sessao("b", "2026-10-28T20:00:00Z", { status: "abandonada", series_concluidas: 0 })], [])).toEqual([]);
    expect(trofeusDoDiaDuplo([sessao("a", "2026-10-28T10:00:00Z"), sessao("b", "2026-10-28T20:00:00Z", { origem: "importado" })], [])).toEqual([]);
    expect(codigos(trofeusDoDiaDuplo([sessao("a", "2026-10-28T10:00:00Z"), sessao("b", "2026-10-28T20:00:00Z", { modo: "extra", series_planejadas: 0, series_concluidas: 6 })], []))).toEqual(["dose_dupla"]);
  });
  it("Dois Fôlegos: 2 cardios de 10+ min no mesmo dia; pedacinho de 8 min não conta", () => {
    expect(codigos(trofeusDoDiaDuplo([], [cardio("1", "2026-10-28", "07:00", 20), cardio("2", "2026-10-28", "19:00", 8)]))).toEqual([]);
    expect(codigos(trofeusDoDiaDuplo([], [cardio("1", "2026-10-28", "07:00", 20), cardio("2", "2026-10-28", "19:00", 15)]))).toEqual(["dois_folegos"]);
    expect(codigos(trofeusDoDiaDuplo([], [cardio("1", "2026-10-28", "07:00", 20), cardio("2", "2026-10-28", "19:00", 15, { status: "nao_realizado" })]))).toEqual([]);
  });
  it("Combo Completo: musculação + cardio válido no mesmo dia", () => {
    expect(codigos(trofeusDoDiaDuplo([sessao("a", "2026-10-28T10:00:00Z")], [cardio("1", "2026-10-27", "19:00", 30)]))).toEqual([]);
    expect(codigos(trofeusDoDiaDuplo([sessao("a", "2026-10-28T10:00:00Z")], [cardio("1", "2026-10-28", "19:00", 30)]))).toEqual(["combo_completo"]);
  });
});
