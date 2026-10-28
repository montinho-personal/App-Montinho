import { describe, expect, it } from "vitest";
import { diasCombo, sequenciaComboAtual, trofeusDoComboSeguido } from "./combo-seguido";
import type { CardioFeito } from "@/lib/cardio/regras";

const sessao = (id: string, dia: string, extra: Record<string, unknown> = {}) => ({ id, iniciado_em: `${dia}T13:00:00Z`, status: "concluida" as const, series_planejadas: 10, series_concluidas: 10, ...extra });
const cardio = (id: string, data: string, duracaoMin: number, extra: Partial<CardioFeito> = {}): CardioFeito =>
  ({ id, origem: "app", modalidade: "esteira", status: "concluido", duracaoMin, planejadoMin: null, intensidadePlanejada: null, intensidade: null, esforco: null, data, realizadoEm: `${data}T19:00:00-03:00`, prescricaoId: null, sessionId: null, distanciaKm: null, fcMedia: null, fcMax: null, observacoes: null, editavel: true, ...extra }) as CardioFeito;
const dia = (n: number) => `2026-10-${String(n).padStart(2, "0")}`;
/** n dias seguidos a partir do dia 1 com musculação + cardio de `min` minutos. */
const seguidos = (n: number, min = 20, desde = 1) => ({
  sessoes: Array.from({ length: n }, (_, i) => sessao(`s${desde + i}`, dia(desde + i))),
  cardios: Array.from({ length: n }, (_, i) => cardio(`c${desde + i}`, dia(desde + i), min)),
});
const codigos = (xs: { codigo: string }[]) => xs.map((x) => x.codigo);

describe("Combo em sequência", () => {
  it("3, 5, 7 e 10 dias seguidos dão os marcos, cada um uma vez", () => {
    const { sessoes, cardios } = seguidos(10);
    expect(codigos(trofeusDoComboSeguido(sessoes, cardios))).toEqual(["combo_3", "combo_5", "combo_7", "combo_10"]);
    expect(codigos(trofeusDoComboSeguido(seguidos(2).sessoes, seguidos(2).cardios))).toEqual([]);
  });
  it("30 dias seguidos dão o desafiador", () => {
    const s = Array.from({ length: 30 }, (_, i) => sessao(`s${i}`, `2026-11-${String(i + 1).padStart(2, "0")}`));
    const c = Array.from({ length: 30 }, (_, i) => cardio(`c${i}`, `2026-11-${String(i + 1).padStart(2, "0")}`, 25));
    expect(codigos(trofeusDoComboSeguido(s, c))).toContain("combo_30");
  });
  it("cardio de 19 min não fecha o dia; 2 partes de 10 min fecham", () => {
    const { sessoes, cardios } = seguidos(3);
    cardios[1] = cardio("x", dia(2), 19);
    expect(trofeusDoComboSeguido(sessoes, cardios)).toEqual([]);
    cardios[1] = cardio("x", dia(2), 10);
    cardios.push(cardio("y", dia(2), 10, { realizadoEm: `${dia(2)}T20:00:00-03:00` }));
    expect(codigos(trofeusDoComboSeguido(sessoes, cardios))).toEqual(["combo_3"]);
  });
  it("partes de menos de 10 min e “não realizado” não contam", () => {
    const { sessoes, cardios } = seguidos(3);
    cardios[1] = cardio("x", dia(2), 15);
    cardios.push(cardio("y", dia(2), 8, { realizadoEm: `${dia(2)}T20:00:00-03:00` }));
    expect(trofeusDoComboSeguido(sessoes, cardios)).toEqual([]);
    const b = seguidos(3);
    b.cardios[1] = cardio("x", dia(2), 30, { status: "nao_realizado" });
    expect(trofeusDoComboSeguido(b.sessoes, b.cardios)).toEqual([]);
  });
  it("um dia sem os dois recomeça a contagem", () => {
    const a = seguidos(2, 20, 1);
    const b = seguidos(3, 20, 4);
    // dia 3 sem musculação: 1-2 e 4-6 são sequências separadas
    const t = trofeusDoComboSeguido([...a.sessoes, ...b.sessoes], [...a.cardios, ...b.cardios, cardio("z", dia(3), 40)]);
    expect(codigos(t)).toEqual(["combo_3"]);
    expect(t[0].evidencia).toEqual({ dias: [dia(4), dia(5), dia(6)] });
  });
  it("musculação importada ou parcial não conta; extra com séries conta", () => {
    const { sessoes, cardios } = seguidos(3);
    sessoes[1] = sessao("s2", dia(2), { origem: "importado" });
    expect(trofeusDoComboSeguido(sessoes, cardios)).toEqual([]);
    sessoes[1] = sessao("s2", dia(2), { status: "abandonada", series_concluidas: 3 });
    expect(trofeusDoComboSeguido(sessoes, cardios)).toEqual([]);
    sessoes[1] = sessao("s2", dia(2), { modo: "extra", series_planejadas: 0, series_concluidas: 6 });
    expect(codigos(trofeusDoComboSeguido(sessoes, cardios))).toEqual(["combo_3"]);
  });
  it("sequência atual: conta até hoje; se hoje ainda não fechou, a de ontem continua", () => {
    const { sessoes, cardios } = seguidos(4);
    const dias = diasCombo(sessoes, cardios);
    expect(sequenciaComboAtual(dias, dia(4))).toBe(4);
    expect(sequenciaComboAtual(dias, dia(5))).toBe(4);
    expect(sequenciaComboAtual(dias, dia(6))).toBe(0);
  });
});
