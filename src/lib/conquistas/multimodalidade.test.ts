import { describe, expect, it } from "vitest";
import { MULTI_FORA_DO_RANKING, primeiroBenchmarkSuperado, trofeusMultimodalidade, type ResultadoBenchmarkConquista } from "./multimodalidade";
import { FORA_DO_RANKING } from "@/lib/ranking/trofeus";
import { trofeusDoDiaDuplo } from "./dia-duplo";
import type { SessaoConquista } from "./regras";

const s = (id: string, iniciado_em: string, modalidade: string | null, extra: Partial<SessaoConquista> = {}): SessaoConquista => ({ id, iniciado_em, status: "concluida", series_planejadas: 2, series_concluidas: 2, modalidade, ...extra });
const bm = (benchmark: string, created_at: string, condicao: "rx" | "scaled" | "adaptado", tempo: number, extra: Partial<ResultadoBenchmarkConquista> = {}): ResultadoBenchmarkConquista => ({ bloco_id: "b", tipo: "metcon", formato: "for_time", condicao, concluido: true, tempo_seg: tempo, benchmark, created_at, ...extra });
const codigos = (xs: { codigo: string }[]) => xs.map((x) => x.codigo).sort();

describe("troféus da Multimodalidade", () => {
  it("primeiros de cada modalidade: só treino que vale (cancelado e importado não)", () => {
    expect(codigos(trofeusMultimodalidade([s("a", "2026-10-28T10:00:00Z", "cross", { status: "abandonada", series_concluidas: 0 }), s("b", "2026-10-28T11:00:00Z", "hyrox", { origem: "importado" })]))).toEqual([]);
    const t = trofeusMultimodalidade([s("a", "2026-10-27T10:00:00Z", "cross"), s("b", "2026-10-28T10:00:00Z", "cross"), s("c", "2026-11-03T10:00:00Z", "hyrox"), s("d", "2026-11-10T10:00:00Z", "funcional")]);
    expect(t.find((x) => x.codigo === "primeiro_wod")?.sessaoId).toBe("a");
    expect(codigos(t)).toEqual(["atleta_versatil", "primeira_hyrox", "primeiro_funcional", "primeiro_wod"]);
  });
  it("WOD do dia (extra sem ficha) conta como treino", () => {
    expect(codigos(trofeusMultimodalidade([s("a", "2026-10-28T10:00:00Z", "cross", { modo: "extra", series_planejadas: 1, series_concluidas: 1 })]))).toEqual(["primeiro_wod"]);
  });
  it("Atleta Versátil: 3 modalidades (musculação conta); no ranking só ele", () => {
    const t = trofeusMultimodalidade([s("a", "2026-10-01T10:00:00Z", null), s("b", "2026-10-10T10:00:00Z", "cross"), s("c", "2026-10-10T12:00:00Z", "cross"), s("d", "2026-10-20T10:00:00Z", "funcional")]);
    expect(t.find((x) => x.codigo === "atleta_versatil")?.sessaoId).toBe("d");
    for (const c of MULTI_FORA_DO_RANKING) expect(FORA_DO_RANKING as readonly string[]).toContain(c);
    expect(FORA_DO_RANKING as readonly string[]).not.toContain("atleta_versatil");
  });
  it("Semana Multimodalidade: 2 modalidades na mesma semana (segunda a domingo); só musculação não vale", () => {
    // Domingo 01/11 e segunda 02/11 são semanas diferentes.
    expect(codigos(trofeusMultimodalidade([s("a", "2026-11-01T12:00:00Z", null), s("b", "2026-11-02T12:00:00Z", "cross")])).filter((c) => c === "semana_multimodalidade")).toEqual([]);
    const t = trofeusMultimodalidade([s("a", "2026-11-02T12:00:00Z", null), s("b", "2026-11-05T12:00:00Z", "hyrox")]);
    expect(t.find((x) => x.codigo === "semana_multimodalidade")?.sessaoId).toBe("b");
    expect(trofeusMultimodalidade([s("a", "2026-11-02T12:00:00Z", null), s("b", "2026-11-03T12:00:00Z", "musculacao")]).length).toBe(0);
  });
  it("benchmarks: primeiro; superou só contra comparáveis (RX × RX, mesma versão, adaptado fora)", () => {
    const lista = [bm("fran", "2026-10-01T10:00:00Z", "rx", 400), bm("fran", "2026-10-08T10:00:00Z", "scaled", 300), bm("fran", "2026-10-15T10:00:00Z", "adaptado", 200), bm("fran", "2026-10-22T10:00:00Z", "rx", 390, { benchmark_versao: 2 })];
    expect(primeiroBenchmarkSuperado(lista)).toBeNull();
    const melhor = bm("fran", "2026-10-29T10:00:00Z", "rx", 380);
    expect(primeiroBenchmarkSuperado([...lista, melhor])?.created_at).toBe(melhor.created_at);
    expect(codigos(trofeusMultimodalidade([], [...lista, melhor]))).toEqual(["primeiro_benchmark", "superando_recorde"]);
  });
  it("Evolução Sem Fronteiras: RM exato subiu + benchmark superado", () => {
    const forca = (id: string, em: string, carga: number, reps: number) => s(id, em, null, { exercicios: [{ exercicio_id: "agach", nome: "Agachamento", series: [{ tipo: "valida", carga_kg: carga, reps }] }] });
    const bms = [bm("grace", "2026-10-01T10:00:00Z", "rx", 300), bm("grace", "2026-10-20T10:00:00Z", "rx", 280)];
    // 80 × 5 e depois 90 × 3: RMs diferentes, não é subida.
    expect(codigos(trofeusMultimodalidade([forca("a", "2026-10-02T10:00:00Z", 80, 5), forca("b", "2026-10-09T10:00:00Z", 90, 3)], bms))).not.toContain("evolucao_sem_fronteiras");
    const t = trofeusMultimodalidade([forca("a", "2026-10-02T10:00:00Z", 80, 5), forca("b", "2026-10-25T10:00:00Z", 85, 5)], bms);
    const e = t.find((x) => x.codigo === "evolucao_sem_fronteiras");
    expect(e?.sessaoId).toBe("b");
  });
  it("Dose Dupla vale para qualquer modalidade (WOD conta pelos blocos)", () => {
    expect(codigos(trofeusDoDiaDuplo([s("a", "2026-10-28T10:00:00Z", null), s("b", "2026-10-28T20:00:00Z", "cross", { modo: "extra", series_planejadas: 1, series_concluidas: 1 })], []))).toEqual(["dose_dupla"]);
  });
});
