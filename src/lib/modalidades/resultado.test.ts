import { describe, expect, it } from "vitest";
import { comparaveis, diferenca, melhorou, rankingDoWod, textoResultado, type ResultadoBloco } from "./resultado";

const r = (x: Partial<ResultadoBloco>): ResultadoBloco => ({ bloco_id: "b3", tipo: "metcon", formato: "for_time", condicao: "rx", concluido: true, ...x });

describe("resultado por formato", () => {
  it("texto de cada formato", () => {
    expect(textoResultado(r({ formato: "amrap", rounds: 7, reps: 5 }))).toBe("7 rounds + 5 reps");
    expect(textoResultado(r({ tempo_seg: 512 }))).toBe("8:32");
    expect(textoResultado(r({ concluido: false, time_cap_seg: 600, reps: 95 }))).toBe("Time cap (10:00) · 95 reps");
    expect(textoResultado(r({ formato: "emom", intervalos: [1, 1, 1, 0, 1] }))).toBe("4 de 5 intervalos");
    expect(textoResultado(r({ formato: "tabata", intervalos: [12, 11, 10, 10, 9, 9, 8, 8] }))).toBe("77 reps · menor round 8");
    expect(textoResultado(r({ tipo: "corrida", formato: null, tempo_seg: 270, distancia_m: 1000 }))).toBe("4:30 · 1 km");
  });
});

describe("comparação justa", () => {
  it("RX nunca com Scaled; adaptado nunca entra", () => {
    expect(comparaveis(r({}), r({ condicao: "scaled" }))).toBe(false);
    expect(comparaveis(r({ condicao: "adaptado" }), r({ condicao: "adaptado" }))).toBe(false);
    expect(melhorou(r({ tempo_seg: 300 }), r({ condicao: "scaled", tempo_seg: 400 }))).toBe(false);
  });
  it("benchmark só com a mesma versão; HYROX parcial nunca com completo", () => {
    expect(comparaveis(r({ benchmark: "fran", benchmark_versao: 1 }), r({ benchmark: "fran", benchmark_versao: 2 }))).toBe(false);
    expect(comparaveis(r({ tipo: "estacao", formato: null, completo: true }), r({ tipo: "estacao", formato: null, completo: false }))).toBe(false);
  });
  it("For Time: menor tempo vence; quem terminou fica na frente de quem estourou o cap", () => {
    expect(melhorou(r({ tempo_seg: 420 }), r({ tempo_seg: 480 }))).toBe(true);
    expect(melhorou(r({ concluido: false, reps: 120 }), r({ tempo_seg: 590 }))).toBe(false);
    expect(diferenca(r({ tempo_seg: 420 }), r({ tempo_seg: 480 }))).toBe("−1:00");
  });
  it("AMRAP: mais rounds e depois mais reps", () => {
    expect(melhorou(r({ formato: "amrap", rounds: 8, reps: 0 }), r({ formato: "amrap", rounds: 7, reps: 20 }))).toBe(true);
    expect(diferenca(r({ formato: "amrap", rounds: 9 }), r({ formato: "amrap", rounds: 7 }))).toBe("+2 rounds");
  });
  it("ranking do dia: RX e Scaled separados, adaptado fora", () => {
    const k = rankingDoWod([r({ tempo_seg: 500 }), r({ tempo_seg: 400 }), r({ condicao: "scaled", tempo_seg: 300 }), r({ condicao: "adaptado", tempo_seg: 200 })]);
    expect(k.rx.map((x) => x.tempo_seg)).toEqual([400, 500]);
    expect(k.scaled).toHaveLength(1);
  });
});
