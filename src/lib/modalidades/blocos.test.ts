import { describe, expect, it } from "vitest";
import { blocosIniciais, duracaoBlocoSeg, ehSimuladoCompleto, normalizarBlocos, novoBloco, resumoBloco, simuladoHyrox } from "./blocos";
import { ehMusculacao } from "./tipos";

describe("modalidade como etiqueta", () => {
  it("sem modalidade = musculação (tudo o que existe continua igual)", () => {
    expect(ehMusculacao(undefined)).toBe(true);
    expect(ehMusculacao(null)).toBe(true);
    expect(ehMusculacao("musculacao")).toBe(true);
    expect(ehMusculacao("cross")).toBe(false);
  });
  it("musculação não ganha blocos", () => {
    expect(blocosIniciais("musculacao")).toEqual([]);
  });
});

describe("blocos do Cross Training", () => {
  it("estrutura inicial com aquecimento, força, WOD e volta à calma, ids únicos", () => {
    const b = blocosIniciais("cross");
    expect(b.map((x) => x.tipo)).toEqual(["aquecimento", "forca", "metcon", "volta_calma"]);
    expect(new Set(b.map((x) => x.id)).size).toBe(4);
    expect(b[2].formato).toBe("amrap");
    expect(b[2].minutos).toBe(12);
  });
  it("resumo por formato", () => {
    expect(resumoBloco({ ...novoBloco("metcon", [], "amrap"), minutos: 20 })).toBe("AMRAP 20 min");
    expect(resumoBloco(novoBloco("metcon", [], "emom"))).toBe("EMOM 10 min");
    expect(resumoBloco({ ...novoBloco("metcon", [], "emom"), intervalo_seg: 120 })).toBe("E2MOM 10 min");
    expect(resumoBloco(novoBloco("metcon", [], "tabata"))).toBe("Tabata 8 × 20 s / 10 s");
    expect(resumoBloco({ ...novoBloco("metcon", [], "for_time"), esquema: "21-15-9" })).toBe("For Time 21-15-9 · limite 10 min");
    expect(resumoBloco(novoBloco("metcon", [], "rounds_for_time"))).toBe("3 rounds For Time · limite 15 min");
  });
  it("duração prevista: AMRAP pelo tempo, Tabata pelos ciclos, For Time pelo limite", () => {
    expect(duracaoBlocoSeg({ ...novoBloco("metcon", [], "amrap"), minutos: 12 })).toBe(720);
    expect(duracaoBlocoSeg(novoBloco("metcon", [], "tabata"))).toBe(240);
    expect(duracaoBlocoSeg({ ...novoBloco("metcon", [], "for_time"), time_cap_seg: null })).toBeNull();
  });
  it("normalizar: tira campos que o formato não usa, ids repetidos e movimentos vazios", () => {
    const [a, b] = normalizarBlocos([
      { ...novoBloco("metcon", [], "amrap"), minutos: 15, rounds: 5, movimentos: [{ nome: " Burpee ", reps: " 10 " }, { nome: "  " }] },
      { ...novoBloco("metcon", [], "amrap"), id: "b1" },
    ]);
    expect(a.rounds).toBeNull();
    expect(a.minutos).toBe(15);
    expect(a.movimentos).toEqual([{ nome: "Burpee", reps: "10", carga: null, scaled: null }]);
    expect(b.id).not.toBe(a.id);
  });
});

describe("HYROX", () => {
  it("simulado completo = 8 × (1 km + estação); parcial não é completo", () => {
    const completo = simuladoHyrox();
    expect(completo).toHaveLength(16);
    expect(completo[0].tipo).toBe("corrida");
    expect(completo[1].movimentos[0].nome).toBe("Ski Erg (ergômetro de esqui)");
    expect(completo[15].movimentos[0].reps).toBe("100");
    expect(ehSimuladoCompleto(completo)).toBe(true);
    expect(ehSimuladoCompleto(simuladoHyrox(4))).toBe(false);
    expect(resumoBloco(completo[0])).toBe("Corrida · 1 km");
  });
  it("liga a estação ao exercício da biblioteca pelo slug", () => {
    const b = simuladoHyrox(1, (s) => (s === "ski-erg" ? "id-ski" : null));
    expect(b[1].movimentos[0].biblioteca_id).toBe("id-ski");
  });
});
