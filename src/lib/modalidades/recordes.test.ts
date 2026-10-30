import { describe, expect, it } from "vitest";
import { porExercicio, recordesDeBenchmark, recordesDeForca, recordesDoDia, type ResultadoBenchmark } from "./recordes";

const s = (data: string, carga: number, reps: number, chave = "clean") => ({ chave, nome: "Clean & Jerk", data, carga, reps });

describe("recordes de força: só RM exato", () => {
  it("36 → 42 kg no 1RM: +6 kg, +16,7%", () => {
    const [l] = recordesDeForca([s("2026-10-01", 36, 1), s("2026-10-20", 42, 1)]);
    expect(l).toMatchObject({ rm: 1, atual: 42, anterior: 36, ganhoKg: 6, ganhoPct: 16.7, data: "2026-10-20" });
    expect(l.historico).toHaveLength(2);
  });
  it("mais carga com outro número de reps NÃO é recorde daquele RM", () => {
    const linhas = recordesDeForca([s("2026-10-01", 60, 5), s("2026-10-10", 70, 3), s("2026-10-12", 50, 4)]);
    expect(linhas.find((l) => l.rm === 5)?.atual).toBe(60);
    expect(linhas.find((l) => l.rm === 3)?.atual).toBe(70);
    expect(linhas.some((l) => l.rm === 1)).toBe(false);
    expect(linhas).toHaveLength(2);
  });
  it("carga menor depois não derruba o recorde; marca anotada entra na linha do tempo", () => {
    const [l] = recordesDeForca([s("2026-10-01", 80, 1), s("2026-10-08", 75, 1)], [{ chave: "clean", nome: "Clean & Jerk", tipo: "1rm", valor: 85, unidade: "kg", data: "2026-10-15" }]);
    expect(l).toMatchObject({ atual: 85, anterior: 80 });
    expect(recordesDoDia([l], "2026-10-15")).toHaveLength(1);
  });
  it("agrupa os RMs por exercício", () => {
    const g = porExercicio(recordesDeForca([s("2026-10-01", 60, 5), s("2026-10-02", 80, 1)]));
    expect(g).toHaveLength(1);
    expect(g[0].rms.map((r) => r.rm)).toEqual([1, 5]);
  });
});

describe("benchmarks: mesma versão e condição", () => {
  const r = (data: string, tempo: number, condicao: "rx" | "scaled" | "adaptado" = "rx", versao = 1): ResultadoBenchmark => ({ bloco_id: "b", tipo: "metcon", formato: "for_time", condicao, concluido: true, tempo_seg: tempo, data, benchmark: "fran", benchmark_versao: versao });
  it("Fran RX: melhor, último e quanto melhorou", () => {
    const [l] = recordesDeBenchmark([r("2026-09-01", 480), r("2026-10-01", 438)]);
    expect(l).toMatchObject({ condicao: "rx", vezes: 2, melhorou: true, diferenca: "−0:42" });
    expect(l.melhor.tempo_seg).toBe(438);
  });
  it("RX e Scaled em linhas separadas; adaptado fora; versão 2 separada", () => {
    const linhas = recordesDeBenchmark([r("2026-09-01", 480), r("2026-09-10", 300, "scaled"), r("2026-09-20", 200, "adaptado"), r("2026-09-30", 400, "rx", 2)]);
    expect(linhas).toHaveLength(3);
    expect(linhas.find((l) => l.condicao === "scaled")?.vezes).toBe(1);
  });
});
