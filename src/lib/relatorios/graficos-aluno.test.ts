import { describe, expect, it } from "vitest";
import type { SessaoCompleta } from "@/lib/data/sessoes";
import { exerciciosComCarga, totaisPorTreino, variacao } from "./graficos-aluno";

const sessao = (id: string, data: string, letra: string | null, series: Array<[string, number, number, string?]>, status = "concluida") =>
  ({ id, iniciado_em: `${data}T15:00:00Z`, status, letra, nome_treino: null, exercicios: [...new Set(series.map((x) => x[0]))].map((nome) => ({ nome, series: series.filter((x) => x[0] === nome).map(([, c, r, t]) => ({ carga_kg: c, reps: r, tipo: t ?? "normal" })) })) }) as unknown as SessaoCompleta;

describe("gráficos da Evolução", () => {
  it("total de cada treino sem aquecimento, em ordem", () => {
    const t = totaisPorTreino([
      sessao("2", "2026-10-10", "B", [["Supino", 50, 10], ["Supino", 20, 15, "aquecimento"]]),
      sessao("1", "2026-10-01", "A", [["Agachamento", 60, 10], ["Agachamento", 60, 8]]),
      sessao("3", "2026-10-12", null, [["Supino", 50, 10]], "abandonada"),
      sessao("4", "2026-10-15", null, [["Remada", 40, 12]]),
    ]);
    expect(t.map((x) => x.rotulo)).toEqual(["A", "B", "Livre"]);
    expect(t[0]).toMatchObject({ series: 2, reps: 18, volumeKg: 1080 });
    expect(t[1].volumeKg).toBe(500);
  });
  it("variação e exercícios mais feitos", () => {
    expect(variacao(100, 125)).toBe(25);
    expect(variacao(0, 10)).toBeNull();
    const ex = exerciciosComCarga([sessao("1", "2026-10-01", "A", [["Supino", 50, 10]]), sessao("2", "2026-10-03", "A", [["Supino", 52, 10], ["Crucifixo", 0, 12]])]);
    expect(ex).toEqual([{ chave: expect.any(String), nome: "Supino", vezes: 2 }]);
  });
});
