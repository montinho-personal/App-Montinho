import { describe, expect, it } from "vitest";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { filtrar, porDia, rotuloDia, textoSerie, treinoFeito, treinosFeitos } from "./treinos-feitos";

const serie = (n: number, carga: number | null, reps: number, extra: Record<string, unknown> = {}) => ({ serie: n, tipo: "valida", carga_kg: carga, reps, rir: null, observacoes: null, desconforto: null, blocos: null, ...extra });
const sessao = (o: Record<string, unknown> = {}, exs: Array<Record<string, unknown>> = []) =>
  ({ id: "s1", aluno_id: "a1", treino_id: "t1", letra: "A", nome_treino: "Peito e tríceps", status: "concluida", iniciado_em: "2026-10-29T10:30:00Z", duracao_seg: 3000, series_planejadas: 4, feedback_percepcao: null, feedback_comentario: null, exercicios: exs.map((e, i) => ({ ordem: i, created_at: "x", nome: "Supino", status: "concluido", series_planejadas: 2, observacao_aluno: null, percepcao: null, substituido_de: null, series: [], ...e })), ...o }) as unknown as SessaoCompleta;

describe("treinos feitos", () => {
  it("monta o cartão com séries, volume e horário de Brasília", () => {
    const t = treinoFeito(sessao({}, [{ series: [serie(1, 40, 10), serie(2, 42.5, 8)], percepcao: "pesado" }, { nome: "Tríceps", series: [serie(1, null, 15), serie(2, 20, 12)] }]));
    expect(t).toMatchObject({ data: "2026-10-29", hora: "07:30", titulo: "Peito e tríceps", tipo: "ficha", status: "concluido", seriesFeitas: 4, volumeKg: 980, duracaoMin: 50 });
    expect(t.exercicios[0].series).toEqual(["40 kg × 10", "42,5 kg × 8"]);
    expect(t.exercicios[0].percepcao).toBe("Pesado");
    expect(t.exercicios[1].series[0]).toBe("× 15");
  });
  it("junta todas as anotações e os sinais", () => {
    const t = treinoFeito(sessao({ checkin_pre: "desconforto", checkin_pre_nota: "joelho chato", feedback_percepcao: "dor", feedback_comentario: "doeu o ombro no fim" }, [
      { observacao_aluno: "máquina 3", series: [serie(1, 40, 10, { observacoes: "pegada fechada" })] },
      { nome: "Crucifixo", status: "nao_consegui", series: [] },
      { nome: "Remada", substituido_de: { nome: "Remada baixa" }, series: [serie(1, 30, 10)] },
    ]));
    expect(t.anotacoes.map((a) => a.texto)).toEqual(["joelho chato", "pegada fechada", "máquina 3", "doeu o ombro no fim"]);
    expect(t.sinais).toEqual(expect.arrayContaining(["desconforto", "dor", "nao_consegui", "trocou"]));
    expect(t.exercicios[2].trocadoDe).toBe("Remada baixa");
    expect(t.status).toBe("parcial");
  });
  it("cancelado sem séries some; livre e extra com títulos", () => {
    const lista = treinosFeitos([sessao({ status: "abandonada" }, [{ series: [] }]), sessao({ id: "s2", treino_id: null, nome_treino: null, modo: "normal" }, [{ series: [serie(1, 10, 10)] }])]);
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ tipo: "livre", titulo: "Treino livre" });
  });
  it("filtros, dias e texto da série", () => {
    const a = treinoFeito(sessao({}, [{ observacao_aluno: "ok", series: [serie(1, 10, 10)] }]));
    const b = { ...treinoFeito(sessao({ id: "s2", letra: "B" }, [{ series: [serie(1, 10, 10)] }])), data: "2026-10-28" };
    expect(filtrar([a, b], "anotacoes")).toEqual([a]);
    expect(filtrar([a, b], "todos", "B")).toEqual([b]);
    expect(porDia([a, b]).map((g) => g.data)).toEqual(["2026-10-29", "2026-10-28"]);
    expect(rotuloDia("2026-10-29", "2026-10-29")).toBe("Hoje");
    expect(rotuloDia("2026-10-28", "2026-10-29")).toBe("Ontem");
    expect(rotuloDia("2026-10-23", "2026-10-29")).toBe("sexta, 23/10");
    expect(textoSerie({ tipo: "aquecimento", carga_kg: 20, reps: 15 })).toBe("aquec. 20 kg × 15");
    expect(textoSerie({ tipo: "rest_pause", carga_kg: 30, reps: 13, blocos: [{ carga: 30, reps: 8 }, { carga: 30, reps: 3 }, { carga: 30, reps: 2 }] })).toBe("rest-pause 30 kg × 8+3+2");
  });
});
