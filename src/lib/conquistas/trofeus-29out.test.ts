import { describe, expect, it } from "vitest";
import { mesesComTreino, trofeusDeTempo } from "./acompanhamento";
import { trofeusDoQuiz, marcosQuizLigados } from "./quiz";
import { contagemCompartilhar, trofeusCompartilharMais, type EventoCompartilhar } from "./compartilhar";
import { janelasDoInicio, trofeusCardioHorario } from "./cardio-horario";
import type { CardioFeito } from "@/lib/cardio/regras";

let n = 0;
const diaISO = (d: string, hora = "13:00:00") => `${d}T${hora}Z`;
const somar = (base: string, dias: number) => new Date(Date.parse(`${base}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
const treino = (dia: string, o: Record<string, unknown> = {}) => ({ id: `t${++n}`, iniciado_em: diaISO(dia), status: "concluida" as const, series_planejadas: 10, series_concluidas: 10, ...o });

describe("Acompanhamento em meses", () => {
  it("3, 6 e 12 meses com treino (blocos de 30 dias, não precisam ser seguidos)", () => {
    const sessoes = [0, 31, 95, 125, 155, 200, 230, 260, 290, 320, 350].map((d) => treino(somar("2026-01-05", d)));
    expect(mesesComTreino(sessoes)).toBe(11);
    expect(trofeusDeTempo(sessoes).filter((t) => t.codigo !== "retomada_30").map((t) => t.codigo)).toEqual(["acompanhamento_3_meses", "acompanhamento_6_meses"]);
    const ano = [...sessoes, treino(somar("2026-01-05", 65))];
    const t = trofeusDeTempo(ano).find((x) => x.codigo === "acompanhamento_1_ano");
    expect(t?.sessaoId).toBe(sessoes[10].id); // o 12º mês com treino fecha no último treino
  });
  it("vários treinos no mesmo mês contam 1; importado não conta", () => {
    const sessoes = [0, 1, 2, 3, 40, 41].map((d) => treino(somar("2026-01-05", d)));
    expect(mesesComTreino(sessoes)).toBe(2);
    expect(mesesComTreino([...sessoes, treino(somar("2026-01-05", 70), { origem: "importado" })])).toBe(2);
  });
  it("Volta por cima: 30+ dias sem treinar, repete; 29 dias não", () => {
    const sessoes = [treino("2026-01-01"), treino("2026-01-30"), treino("2026-03-15"), treino("2026-05-01")];
    const r = trofeusDeTempo(sessoes).filter((t) => t.codigo === "retomada_30");
    expect(r.map((x) => x.referencia)).toEqual(["2026-03-15", "2026-05-01"]);
  });
});

describe("Autoconhecimento (quiz)", () => {
  it("conta só respostas certas, 1 por pergunta, pela ordem", () => {
    const rs = Array.from({ length: 12 }, (_, i) => ({ conteudo_id: `c${i}`, acertou: i !== 3, em: `2026-10-${String(i + 1).padStart(2, "0")}T10:00:00Z` }));
    rs.push({ conteudo_id: "c0", acertou: true, em: "2026-10-20T10:00:00Z" });
    const t = trofeusDoQuiz(rs);
    expect(t.map((x) => x.codigo)).toEqual(["quiz_1", "quiz_10"]);
    expect(t[1].data).toBe("2026-10-11T10:00:00Z");
  });
  it("o de 50 só existe com 50+ perguntas", () => {
    expect(marcosQuizLigados(30)).toEqual([1, 10, 30]);
    expect(marcosQuizLigados(50)).toEqual([1, 10, 30, 50]);
  });
});

const ev = (o: Partial<EventoCompartilhar>): EventoCompartilhar => ({ tipo: "compartilhar_nativo", origem: "conclusao", modelo: "A", ref: null, created_at: "2026-10-01T12:00:00Z", ...o });

describe("Compartilhar: cards, troféus e semana", () => {
  it("10 cards de treinos diferentes; repetir o mesmo card não soma", () => {
    const evs = Array.from({ length: 10 }, (_, i) => ev({ ref: `sessao:s${i}`, created_at: `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z` }));
    evs.push(ev({ ref: "sessao:s0", created_at: "2026-10-02T12:00:00Z" }));
    expect(contagemCompartilhar(evs).cards).toBe(10);
    expect(trofeusCompartilharMais(evs).map((x) => x.codigo)).toEqual(["cards_10"]);
    expect(contagemCompartilhar(evs.slice(0, 9)).cards).toBe(9);
  });
  it("cards antigos sem referência contam 1 por dia", () => {
    const evs = [ev({ created_at: "2026-10-01T12:00:00Z" }), ev({ created_at: "2026-10-01T15:00:00Z" }), ev({ created_at: "2026-10-02T12:00:00Z" })];
    expect(contagemCompartilhar(evs).cards).toBe(2);
  });
  it("10 troféus diferentes compartilhados", () => {
    const evs = Array.from({ length: 10 }, (_, i) => ev({ origem: "medalha", ref: `medalha:cod${i}`, created_at: `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z` }));
    expect(trofeusCompartilharMais(evs).map((x) => x.codigo)).toEqual(["trofeus_compartilhados_10"]);
  });
  it("Semana Compartilhada: todos os treinos da semana cumprida com card", () => {
    const semanas = [{ inicio: "2026-10-05", status: "cumprida", meta: 3 }];
    const treinos = [{ id: "a", dia: "2026-10-05" }, { id: "b", dia: "2026-10-07" }, { id: "c", dia: "2026-10-09" }];
    const dois = [ev({ ref: "sessao:a" }), ev({ ref: "sessao:b" })];
    expect(trofeusCompartilharMais(dois, semanas, treinos).some((x) => x.codigo === "semana_compartilhada")).toBe(false);
    const tres = [...dois, ev({ ref: "sessao:c", created_at: "2026-10-09T20:00:00Z" })];
    const t = trofeusCompartilharMais(tres, semanas, treinos).find((x) => x.codigo === "semana_compartilhada");
    expect(t?.data).toBe("2026-10-09T20:00:00Z");
    expect(trofeusCompartilharMais(tres, [{ ...semanas[0], status: "parcial" }], treinos).some((x) => x.codigo === "semana_compartilhada")).toBe(false);
  });
});

const cardio = (o: Partial<CardioFeito>): CardioFeito => ({ id: `c${++n}`, origem: "app", modalidade: "esteira", status: "concluido", duracaoMin: 20, planejadoMin: null, intensidadePlanejada: null, intensidade: null, esforco: null, data: "2026-10-29", realizadoEm: "2026-10-29T08:00:00Z", prescricaoId: null, sessionId: null, distanciaKm: null, fcMedia: null, fcMax: null, observacoes: null, editavel: true, iniciadoNoApp: null, ...o });
// Brasília = UTC−3: 04h00 em Brasília = 07h00Z.
describe("Cardio por horário (começado no app)", () => {
  it("4h00 vale para o das 4h e o de antes das 5h; 4h01 só para o de antes das 5h", () => {
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T07:00:59Z" })).sort()).toEqual(["cardio_4h", "cardio_madrugada"]);
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T07:01:00Z" }))).toEqual(["cardio_madrugada"]);
  });
  it("4h59 vale, 5h00 não; meia-noite até 2h59", () => {
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T07:59:00Z" }))).toEqual(["cardio_madrugada"]);
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T08:00:00Z" }))).toEqual([]);
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T03:00:00Z" }))).toEqual(["cardio_meia_noite"]);
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T05:59:00Z" }))).toEqual(["cardio_meia_noite"]);
    expect(janelasDoInicio(cardio({ iniciadoNoApp: "2026-10-29T06:00:00Z" })).sort()).toEqual(["cardio_4h", "cardio_madrugada"]);
  });
  it("sem começar no app, do Strava, curto ou não realizado não vale", () => {
    expect(janelasDoInicio(cardio({ iniciadoNoApp: null, realizadoEm: "2026-10-29T07:00:00Z" }))).toEqual([]);
    expect(janelasDoInicio(cardio({ origem: "strava", iniciadoNoApp: "2026-10-29T07:00:00Z" }))).toEqual([]);
    expect(janelasDoInicio(cardio({ duracaoMin: 9, iniciadoNoApp: "2026-10-29T07:00:00Z" }))).toEqual([]);
    expect(janelasDoInicio(cardio({ status: "nao_realizado", iniciadoNoApp: "2026-10-29T07:00:00Z" }))).toEqual([]);
  });
  it("10 km somando o dia (esteira, caminhada, corrida, HIIT); bike não", () => {
    expect(trofeusCardioHorario([cardio({ distanciaKm: 6 }), cardio({ modalidade: "bike", distanciaKm: 20 })])).toEqual([]);
    const t = trofeusCardioHorario([cardio({ distanciaKm: 6 }), cardio({ modalidade: "corrida", distanciaKm: 4, realizadoEm: "2026-10-29T20:00:00Z" })]);
    expect(t.map((x) => x.codigo)).toEqual(["cardio_10km"]);
    expect(trofeusCardioHorario([cardio({ distanciaKm: 6 }), cardio({ data: "2026-10-30", distanciaKm: 4 })])).toEqual([]);
  });
  it("1 hora de escada no dia, em partes de 10+ min", () => {
    expect(trofeusCardioHorario([cardio({ modalidade: "escada", duracaoMin: 30 }), cardio({ modalidade: "escada", duracaoMin: 30 })]).map((x) => x.codigo)).toEqual(["cardio_escada_1h"]);
    expect(trofeusCardioHorario([cardio({ modalidade: "escada", duracaoMin: 55 }), cardio({ modalidade: "escada", duracaoMin: 5 })])).toEqual([]);
  });
});
