import { describe, expect, it } from "vitest";
import { diasDeCardio, juntarCardios, pendentesHoje, proximoMarco, resumoSemana, semanasDeCardio, sinaisDoCardio, trofeusDoCardio, type CardioFeito } from "./regras";
import { modalidadeDoStrava, modalidadeDoTexto } from "./modalidades";

let n = 0;
function feito(data: string, min: number, extra: Partial<CardioFeito> = {}): CardioFeito {
  n++;
  return {
    id: `c${n}`,
    origem: "app",
    modalidade: "esteira",
    status: "concluido",
    duracaoMin: min,
    planejadoMin: null,
    intensidadePlanejada: null,
    intensidade: null,
    esforco: null,
    data,
    realizadoEm: `${data}T${String(10 + (n % 10)).padStart(2, "0")}:00:00-03:00`,
    prescricaoId: null,
    sessionId: null,
    distanciaKm: null,
    fcMedia: null,
    fcMax: null,
    observacoes: null,
    editavel: true,
    ...extra,
  };
}
const presc = (extra: Partial<{ frequencia_semanal: number; duracao_min: number; created_at: string; desativado_em: string | null; ativo: boolean }> = {}) => ({
  id: "p1",
  frequencia_semanal: 3,
  duracao_min: 30,
  created_at: "2026-09-28T09:00:00-03:00",
  desativado_em: null,
  ativo: true,
  ...extra,
});
// 2026-09-28 é segunda-feira.
const semana = (inicio: string, qtd: number, min = 30, p: Partial<CardioFeito> = {}) =>
  Array.from({ length: qtd }, (_, i) => feito(`${inicio.slice(0, 8)}${String(+inicio.slice(8) + i).padStart(2, "0")}`, min, { planejadoMin: 30, prescricaoId: "p1", ...p }));

describe("validade do cardio (1 por dia, 10+ min, 50% do prescrito)", () => {
  it("pedacinhos do mesmo dia somam e viram um só", () => {
    const d = diasDeCardio([feito("2026-10-01", 6), feito("2026-10-01", 6), feito("2026-10-01", 6)]);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ minutos: 18, valido: true });
  });
  it("menos de 10 min no dia não vale", () => {
    expect(diasDeCardio([feito("2026-10-01", 9)])[0].valido).toBe(false);
  });
  it("parcial vale com 50% do prescrito; abaixo disso não", () => {
    expect(diasDeCardio([feito("2026-10-01", 20, { status: "parcial", planejadoMin: 40 })])[0].valido).toBe(true);
    expect(diasDeCardio([feito("2026-10-02", 19, { status: "parcial", planejadoMin: 40 })])[0].valido).toBe(false);
  });
  it("não realizado nunca conta", () => {
    expect(diasDeCardio([feito("2026-10-01", 0, { status: "nao_realizado" })])).toHaveLength(0);
  });
});

describe("fontes sem duplicar", () => {
  it("Strava perto de um registro do aluno é a mesma atividade", () => {
    const manual = feito("2026-10-01", 30, { realizadoEm: "2026-10-01T07:30:00-03:00" });
    const strava = feito("2026-10-01", 31, { origem: "strava", realizadoEm: "2026-10-01T07:00:00-03:00", editavel: false });
    const outro = feito("2026-10-01", 40, { origem: "strava", realizadoEm: "2026-10-01T19:00:00-03:00", editavel: false });
    expect(juntarCardios([manual], [], [strava, outro]).map((x) => x.id)).toEqual([manual.id, outro.id]);
  });
  it("extra já registrado pelo cardio do treino não entra de novo", () => {
    const extra = feito("2026-10-01", 30, { origem: "extra", id: "sess-1" });
    const reg = feito("2026-10-01", 30, { sessionId: "sess-1" });
    expect(juntarCardios([reg], [extra], [])).toHaveLength(1);
  });
});

describe("semana de cardio", () => {
  it("meta, realizado e quanto falta", () => {
    const s = semanasDeCardio({ prescricoes: [presc({ frequencia_semanal: 4 })], feitos: [feito("2026-10-05", 30), feito("2026-10-06", 45)], hoje: "2026-10-07" });
    const atual = s.at(-1)!;
    expect(atual).toMatchObject({ alvoSessoes: 4, alvoMin: 120, sessoes: 2, minutos: 75, status: "em_andamento" });
    expect(resumoSemana(atual)).toEqual({ pct: 63, faltamMin: 45, faltamSessoes: 2 });
  });
  it("trocar a prescrição no meio da semana: vale a nova para a semana toda; a antiga continua nas semanas passadas", () => {
    const antiga = presc({ frequencia_semanal: 2, desativado_em: "2026-10-08T10:00:00-03:00", ativo: false });
    const nova = { ...presc({ frequencia_semanal: 4, created_at: "2026-10-08T10:00:00-03:00" }), id: "p2" };
    const s = semanasDeCardio({ prescricoes: [antiga, nova], feitos: [], hoje: "2026-10-09" });
    expect(s.find((x) => x.inicio === "2026-09-28")!.alvoSessoes).toBe(2);
    expect(s.find((x) => x.inicio === "2026-10-05")!.alvoSessoes).toBe(4);
  });
  it("sem prescrição = sem meta (cardio livre aparece, mas não cobra)", () => {
    const s = semanasDeCardio({ prescricoes: [], feitos: [feito("2026-10-01", 30)], hoje: "2026-10-02" });
    expect(s[0].status).toBe("sem_prescricao");
  });
});

describe("troféus de cardio", () => {
  it("quantidade acumulada, 1 por dia", () => {
    const feitos = [feito("2026-10-01", 30), feito("2026-10-01", 30), feito("2026-10-02", 30), feito("2026-10-03", 30)];
    const t = trofeusDoCardio({ prescricoes: [], feitos }, "2026-10-04").map((x) => x.codigo);
    expect(t).toEqual(expect.arrayContaining(["cardio_1", "cardio_2", "cardio_3"]));
    expect(t).not.toContain("cardio_10");
  });
  it("24 cardios: falta 1 para o Fôlego de Respeito", () => {
    const feitos = Array.from({ length: 24 }, (_, i) => feito(`2026-0${i < 20 ? 8 : 9}-${String((i % 20) + 1).padStart(2, "0")}`, 30));
    expect(proximoMarco(feitos)).toEqual({ feitos: 24, proximo: 25, faltam: 1 });
  });
  it("Uma Hora de Chalalá só com prescrição de 60+ min e sem passar dela", () => {
    expect(trofeusDoCardio({ prescricoes: [], feitos: [feito("2026-10-01", 70)] }, "2026-10-02").map((x) => x.codigo)).not.toContain("cardio_uma_hora");
    expect(trofeusDoCardio({ prescricoes: [], feitos: [feito("2026-10-01", 90, { planejadoMin: 60 })] }, "2026-10-02").map((x) => x.codigo)).not.toContain("cardio_uma_hora");
    expect(trofeusDoCardio({ prescricoes: [], feitos: [feito("2026-10-01", 60, { planejadoMin: 60 })] }, "2026-10-02").map((x) => x.codigo)).toContain("cardio_uma_hora");
  });
  it("Semana no Ritmo (sessões) e 100% no Plano (minutos, com 10% de tolerância)", () => {
    const t = trofeusDoCardio({ prescricoes: [presc()], feitos: semana("2026-09-29", 3, 28) }, "2026-10-06").map((x) => x.codigo);
    expect(t).toContain("cardio_semana_ritmo");
    expect(t).toContain("cardio_meta_semana");
    const so2 = trofeusDoCardio({ prescricoes: [presc()], feitos: semana("2026-09-29", 2, 45) }, "2026-10-06").map((x) => x.codigo);
    expect(so2).not.toContain("cardio_semana_ritmo");
    expect(so2).toContain("cardio_meta_semana");
  });
  it("Fôlego de Ferro: 4 semanas seguidas; pausa não quebra, semana fraca quebra", () => {
    const quatro = [...semana("2026-09-29", 3), ...semana("2026-10-06", 3), ...semana("2026-10-13", 3), ...semana("2026-10-20", 3)];
    expect(trofeusDoCardio({ prescricoes: [presc()], feitos: quatro }, "2026-10-27").map((x) => x.codigo)).toContain("cardio_4_semanas");
    const comPausa = [...semana("2026-09-29", 3), ...semana("2026-10-06", 3), ...semana("2026-10-20", 3), ...semana("2026-10-27", 3)];
    expect(trofeusDoCardio({ prescricoes: [presc()], feitos: comPausa, semanasPausadas: ["2026-10-12"] }, "2026-11-03").map((x) => x.codigo)).toContain("cardio_4_semanas");
    const quebrou = [...semana("2026-09-29", 3), ...semana("2026-10-06", 1), ...semana("2026-10-13", 3), ...semana("2026-10-20", 3)];
    expect(trofeusDoCardio({ prescricoes: [presc()], feitos: quebrou }, "2026-10-27").map((x) => x.codigo)).not.toContain("cardio_4_semanas");
  });
  it("Voltei a Respirar depois de 14+ dias, uma por volta", () => {
    const t = trofeusDoCardio({ prescricoes: [], feitos: [feito("2026-09-01", 30), feito("2026-09-20", 30), feito("2026-09-21", 30), feito("2026-10-10", 30)] }, "2026-10-11");
    expect(t.filter((x) => x.codigo === "cardio_voltei").map((x) => x.referencia)).toEqual(["2026-09-20", "2026-10-10"]);
  });
  it("recalcular não duplica: mesma entrada, mesmos códigos e referências", () => {
    const e = { prescricoes: [presc()], feitos: semana("2026-09-29", 3) };
    const a = trofeusDoCardio(e, "2026-10-06").map((x) => `${x.codigo}:${x.referencia}`);
    const b = trofeusDoCardio(e, "2026-10-06").map((x) => `${x.codigo}:${x.referencia}`);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });
});

describe("sinais para o personal", () => {
  it("adesão baixa e esforço alto em cardio moderado", () => {
    const feitos = [feito("2026-10-06", 30, { prescricaoId: "p1", planejadoMin: 30, esforco: 9, intensidadePlanejada: "moderada" }), feito("2026-10-14", 30, { esforco: 8, intensidadePlanejada: "moderada" })];
    const s = semanasDeCardio({ prescricoes: [presc()], feitos, hoje: "2026-10-15" });
    const tipos = sinaisDoCardio(s, feitos, "2026-10-15").map((x) => x.tipo);
    expect(tipos).toContain("adesao_baixa");
    expect(tipos).toContain("esforco_alto");
  });
  it("4 semanas cumpridas = evolução", () => {
    const feitos = [...semana("2026-09-29", 3), ...semana("2026-10-06", 3), ...semana("2026-10-13", 3), ...semana("2026-10-20", 3)];
    const s = semanasDeCardio({ prescricoes: [presc()], feitos, hoje: "2026-10-27" });
    expect(sinaisDoCardio(s, feitos, "2026-10-27").map((x) => x.tipo)).toContain("evolucao");
  });
});

describe("pendentes de hoje e modalidades", () => {
  it("prescrito para segunda e ainda não feito aparece; já feito some", () => {
    const p = [{ id: "p1", dias: [1], frequencia_semanal: 3, ativo: true }];
    expect(pendentesHoje(p, [], "2026-10-05")).toHaveLength(1);
    expect(pendentesHoje(p, [feito("2026-10-05", 30, { prescricaoId: "p1" })], "2026-10-05")).toHaveLength(0);
    expect(pendentesHoje(p, [], "2026-10-06")).toHaveLength(0);
  });
  it("lê a modalidade do extra e do Strava", () => {
    expect(modalidadeDoTexto("Caminhada leve 30 min")).toBe("caminhada");
    expect(modalidadeDoTexto("Bike ergométrica")).toBe("bike_ergometrica");
    expect(modalidadeDoStrava("VirtualRun")).toBe("esteira");
    expect(modalidadeDoStrava("Ride")).toBe("bike");
  });
});
